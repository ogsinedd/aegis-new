import uuid
import json
from typing import List, Optional, Dict, Any
import httpx
from sqlalchemy.orm import Session
from loguru import logger
from datetime import datetime

from app.models.models import ScanHistory, Vulnerability, Host, Container, ScanStatus as ModelScanStatus, ContainerStatus
from app.schemas.scan import ScanRequest
from app.services.container_service import ContainerService

class ScanService:
    @staticmethod
    def get_scan_history(db: Session, skip: int = 0, limit: int = 100) -> List[ScanHistory]:
        """Получение истории сканирований"""
        return db.query(ScanHistory).order_by(ScanHistory.started_at.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_scan_by_id(db: Session, scan_id: str) -> Optional[ScanHistory]:
        """Получение сканирования по ID"""
        return db.query(ScanHistory).filter(ScanHistory.scan_id == scan_id).first()
    
    @staticmethod
    def get_vulnerabilities(
        db: Session, 
        scan_id: Optional[str] = None,
        host_id: Optional[str] = None,
        container_id: Optional[str] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Vulnerability]:
        """Получение уязвимостей с фильтрацией"""
        query = db.query(Vulnerability)
        
        if scan_id:
            query = query.filter(Vulnerability.scan_id == scan_id)
        
        if host_id or container_id:
            # Присоединяем таблицу сканирований для фильтрации по host_id и container_id
            query = query.join(ScanHistory, ScanHistory.scan_id == Vulnerability.scan_id)
            
            if host_id:
                query = query.filter(ScanHistory.host_id == host_id)
            
            if container_id:
                query = query.filter(ScanHistory.container_id == container_id)
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    async def start_scan(db: Session, scan_request: ScanRequest) -> Optional[ScanHistory]:
        """Запуск нового сканирования"""
        # Проверяем, существует ли хост
        host = db.query(Host).filter(Host.id == scan_request.host_id).first()
        if not host:
            logger.error(f"Host not found: {scan_request.host_id}")
            return None
        
        # Проверяем, существует ли контейнер
        container = db.query(Container).filter(
            Container.container_id == scan_request.container_id,
            Container.host_id == scan_request.host_id
        ).first()
        if not container:
            logger.error(f"Container not found: {scan_request.container_id} on host {scan_request.host_id}")
            return None
        
        # Создаем новую запись сканирования
        scan_id = str(uuid.uuid4())
        db_scan = ScanHistory(
            scan_id=scan_id,
            host_id=scan_request.host_id,
            container_id=scan_request.container_id,
            status=ModelScanStatus.PENDING
        )
        db.add(db_scan)
        db.commit()
        db.refresh(db_scan)
        
        # Обновляем статус контейнера
        ContainerService.update_container_status(
            db, 
            scan_request.container_id, 
            scan_request.host_id, 
            ContainerStatus.SCANNING
        )
        
        # Запускаем сканирование на хосте
        try:
            async with httpx.AsyncClient() as client:
                url = f"http://{host.address}:{host.port}/scan"
                logger.info(f"Starting scan for container {container.container_id} on host {host.name}")
                
                response = await client.post(
                    url,
                    json={"container_id": container.container_id},
                    timeout=30.0
                )
                response.raise_for_status()
                sidecar_scan_result = response.json()
                
                # Обновляем статус сканирования
                db_scan.status = ModelScanStatus[sidecar_scan_result["status"].upper()]
                db.commit()
                db.refresh(db_scan)
                
                return db_scan
        except httpx.HTTPError as e:
            logger.error(f"HTTP error starting scan on {host.name}: {str(e)}")
            db_scan.status = ModelScanStatus.ERROR
            db.commit()
            
            # Обновляем статус контейнера
            ContainerService.update_container_status(
                db, 
                scan_request.container_id, 
                scan_request.host_id, 
                ContainerStatus.ERROR
            )
            
            return db_scan
        except Exception as e:
            logger.error(f"Error starting scan on {host.name}: {str(e)}")
            db_scan.status = ModelScanStatus.ERROR
            db.commit()
            
            # Обновляем статус контейнера
            ContainerService.update_container_status(
                db, 
                scan_request.container_id, 
                scan_request.host_id, 
                ContainerStatus.ERROR
            )
            
            return db_scan
    
    @staticmethod
    async def check_scan_status(db: Session, scan_id: str) -> Optional[ScanHistory]:
        """Проверка статуса сканирования и обработка результатов"""
        db_scan = ScanService.get_scan_by_id(db, scan_id)
        if not db_scan:
            logger.error(f"Scan not found: {scan_id}")
            return None
        
        # Если сканирование уже завершено или произошла ошибка, просто возвращаем его
        if db_scan.status in [ModelScanStatus.COMPLETED, ModelScanStatus.ERROR]:
            return db_scan
        
        # Получаем хост и контейнер
        host = db.query(Host).filter(Host.id == db_scan.host_id).first()
        if not host:
            logger.error(f"Host not found for scan: {scan_id}")
            db_scan.status = ModelScanStatus.ERROR
            db.commit()
            return db_scan
        
        # Запрашиваем статус сканирования с хоста
        try:
            async with httpx.AsyncClient() as client:
                url = f"http://{host.address}:{host.port}/scan/{scan_id}"
                logger.info(f"Checking scan status for scan {scan_id} on host {host.name}")
                
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                sidecar_scan_result = response.json()
                
                # Обновляем статус сканирования
                new_status = ModelScanStatus[sidecar_scan_result["status"].upper()]
                db_scan.status = new_status
                
                if new_status == ModelScanStatus.COMPLETED:
                    db_scan.finished_at = datetime.now()
                    
                    # Обновляем статус контейнера
                    ContainerService.update_container_status(
                        db, 
                        db_scan.container_id, 
                        db_scan.host_id, 
                        ContainerStatus.SCANNED
                    )
                    
                    # Обрабатываем результаты сканирования
                    if "results" in sidecar_scan_result and sidecar_scan_result["results"]:
                        ScanService.process_vulnerabilities(db, db_scan.scan_id, sidecar_scan_result["results"])
                
                elif new_status == ModelScanStatus.ERROR:
                    db_scan.finished_at = datetime.now()
                    
                    # Обновляем статус контейнера
                    ContainerService.update_container_status(
                        db, 
                        db_scan.container_id, 
                        db_scan.host_id, 
                        ContainerStatus.ERROR
                    )
                
                db.commit()
                db.refresh(db_scan)
                return db_scan
        
        except httpx.HTTPError as e:
            logger.error(f"HTTP error checking scan status on {host.name}: {str(e)}")
            return db_scan
        except Exception as e:
            logger.error(f"Error checking scan status on {host.name}: {str(e)}")
            return db_scan
    
    @staticmethod
    def process_vulnerabilities(db: Session, scan_id: str, scan_results: Dict[str, Any]) -> None:
        """Обработка результатов сканирования и сохранение уязвимостей в БД"""
        try:
            # Проверяем, существуют ли результаты сканирования
            if not scan_results or "Results" not in scan_results:
                logger.warning(f"No vulnerability results for scan {scan_id}")
                return
            
            results = scan_results.get("Results", [])
            for result in results:
                if "Vulnerabilities" not in result:
                    continue
                
                vulnerabilities = result.get("Vulnerabilities", [])
                for vuln_data in vulnerabilities:
                    # Извлекаем рекомендации и описание из результатов Trivy
                    description = vuln_data.get("Description", "")
                    
                    # Получаем рекомендации из различных полей Trivy
                    primary_recommendation = vuln_data.get("PrimaryURL", "")
                    fixed_version = vuln_data.get("FixedVersion", "")
                    references = vuln_data.get("References", [])
                    
                    # Формируем рекомендацию на основе доступных данных
                    recommendation = ""
                    if fixed_version:
                        recommendation += f"Обновите до версии: {fixed_version}. "
                    
                    if primary_recommendation:
                        recommendation += f"Подробнее: {primary_recommendation}"
                    
                    # Если нет основной рекомендации, но есть дополнительные ссылки
                    if not recommendation and references:
                        recommendation = f"Дополнительная информация: {references[0]}"
                    
                    # Создаем запись уязвимости
                    vulnerability = Vulnerability(
                        scan_id=scan_id,
                        cve_id=vuln_data.get("VulnerabilityID", "Unknown"),
                        cvss=vuln_data.get("CVSS", {}).get("V3Score", ""),
                        severity=vuln_data.get("Severity", ""),
                        description=description,
                        recommendation=recommendation,
                        details=vuln_data
                    )
                    db.add(vulnerability)
            
            db.commit()
            logger.info(f"Processed vulnerabilities for scan {scan_id}")
        
        except Exception as e:
            logger.error(f"Error processing vulnerabilities for scan {scan_id}: {str(e)}")
            db.rollback()

    # Добавляем новый метод для скачивания отчета
    @staticmethod
    def get_scan_report(db: Session, scan_id: str, format: str = 'json') -> Optional[Dict[str, Any]]:
        """Получение полного отчета сканирования в JSON или CSV формате"""
        try:
            # Получаем данные сканирования
            scan = ScanService.get_scan_by_id(db, scan_id)
            if not scan:
                logger.error(f"Scan not found: {scan_id}")
                return None
                
            # Получаем все уязвимости для этого сканирования
            vulnerabilities = ScanService.get_vulnerabilities(db, scan_id=scan_id)
            
            # Формируем отчет
            report = {
                "scan_id": scan.scan_id,
                "host_id": scan.host_id,
                "container_id": scan.container_id,
                "status": scan.status.value,
                "started_at": scan.started_at.isoformat() if scan.started_at else None,
                "finished_at": scan.finished_at.isoformat() if scan.finished_at else None,
                "vulnerabilities": []
            }
            
            # Добавляем уязвимости в отчет
            for vuln in vulnerabilities:
                vulnerability_data = {
                    "id": vuln.id,
                    "cve_id": vuln.cve_id,
                    "severity": vuln.severity,
                    "cvss": vuln.cvss,
                    "description": vuln.description,
                    "recommendation": vuln.recommendation
                }
                
                # Добавляем полные детали только для JSON формата
                if format == 'json' and vuln.details:
                    vulnerability_data["details"] = vuln.details
                
                report["vulnerabilities"].append(vulnerability_data)
            
            return report
            
        except Exception as e:
            logger.error(f"Error getting scan report for {scan_id}: {str(e)}")
            return None 
