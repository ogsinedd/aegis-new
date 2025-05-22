from sqlalchemy.orm import Session
import os
from typing import Optional, Dict, Any, List

from app.models.models import ScanHistory, Vulnerability, Container

class RemediationService:
    def __init__(self, db: Session):
        self.db = db
        self._parallelism = int(os.getenv("REMEDIATION_PARALLELISM", "2"))
    
    def get_parallelism(self) -> int:
        """Получить параметр параллелизма для применения исправлений"""
        return self._parallelism
    
    def get_affected_containers_count(
        self, 
        scan_id: str, 
        vulnerability_id: Optional[str] = None
    ) -> int:
        """
        Получить количество контейнеров, затрагиваемых конкретной уязвимостью или 
        всеми уязвимостями в сканировании
        """
        # Если указан ID уязвимости, считаем контейнеры, затронутые только этой уязвимостью
        if vulnerability_id:
            vulnerability = self.db.query(Vulnerability).filter(
                Vulnerability.id == vulnerability_id,
                Vulnerability.scan_id == scan_id
            ).first()
            
            if not vulnerability:
                return 0
                
            # Для простоты считаем, что это один контейнер
            return 1
        else:
            # Если ID уязвимости не указан, считаем все контейнеры, затронутые сканированием
            scan = self.db.query(ScanHistory).filter(
                ScanHistory.scan_id == scan_id
            ).first()
            
            if not scan:
                return 0
                
            # Для простоты считаем, что это один контейнер
            # В реальном приложении здесь должна быть логика агрегации уязвимых контейнеров
            return 1
    
    def apply_remediation(
        self, 
        scan_id: str, 
        vulnerability_id: Optional[str] = None,
        strategy: str = "restart"
    ) -> Dict[str, Any]:
        """
        Применить стратегию исправления к уязвимости или всем уязвимостям в сканировании
        
        Стратегии:
        - hot-patch: применение патча без перезапуска
        - rolling-update: обновление контейнеров по одному
        - restart: остановка и перезапуск с обновленным образом
        """
        # Находим сканирование
        scan = self.db.query(ScanHistory).filter(
            ScanHistory.scan_id == scan_id
        ).first()
        
        if not scan:
            raise ValueError(f"Scan with ID {scan_id} not found")
        
        # Находим контейнер
        container = self.db.query(Container).filter(
            Container.container_id == scan.container_id,
            Container.host_id == scan.host_id
        ).first()
        
        if not container:
            raise ValueError(f"Container {scan.container_id} not found")
        
        # Собираем данные для отчета
        result = {
            "scan_id": scan_id,
            "container_id": container.container_id,
            "container_name": container.name,
            "strategy": strategy,
            "status": "scheduled",
            "message": f"Remediation using {strategy} strategy has been scheduled"
        }
        
        # Добавляем информацию о конкретной уязвимости, если указана
        if vulnerability_id:
            vulnerability = self.db.query(Vulnerability).filter(
                Vulnerability.id == vulnerability_id,
                Vulnerability.scan_id == scan_id
            ).first()
            
            if vulnerability:
                result["vulnerability"] = {
                    "id": vulnerability.id,
                    "cve_id": vulnerability.cve_id,
                    "severity": vulnerability.severity
                }
        
        # В реальном приложении здесь должен быть код для выполнения действий
        # по исправлению уязвимостей с использованием выбранной стратегии
        
        return result 
