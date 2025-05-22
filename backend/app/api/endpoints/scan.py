# Добавить эндпоинт для скачивания отчетов

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Response
from fastapi.responses import StreamingResponse
from typing import List, Optional
import io
import csv
import json
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.scan import (
    ScanRequest, ScanResponse, ScanHistoryResponse, VulnerabilityResponse
)
from app.services.scan_service import ScanService
from app.services.vulnerability_service import VulnerabilityService

router = APIRouter()

@router.post("/", response_model=ScanResponse)
async def start_scan(
    scan_request: ScanRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Запустить новое сканирование контейнера"""
    scan_service = ScanService(db)
    return scan_service.start_scan(scan_request, background_tasks)

@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(scan_id: str, db: Session = Depends(get_db)):
    """Получить информацию о конкретном сканировании"""
    scan_service = ScanService(db)
    scan = scan_service.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan

@router.get("/", response_model=List[ScanHistoryResponse])
async def get_scan_history(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Получить историю сканирований"""
    scan_service = ScanService(db)
    return scan_service.get_scan_history(skip, limit)

@router.get("/{scan_id}/report")
async def download_scan_report(
    scan_id: str,
    format: str = Query("json", regex="^(json|csv)$"),
    db: Session = Depends(get_db)
):
    """Скачать отчет о сканировании в формате JSON или CSV"""
    scan_service = ScanService(db)
    vulnerability_service = VulnerabilityService(db)
    
    scan = scan_service.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    vulnerabilities = vulnerability_service.get_vulnerabilities(scan_id=scan_id)
    
    if format == "json":
        # Создаем JSON-отчет
        report_data = {
            "scan_id": scan.scan_id,
            "host_id": scan.host_id,
            "container_id": scan.container_id,
            "started_at": scan.started_at,
            "finished_at": scan.finished_at,
            "status": scan.status,
            "vulnerabilities": [
                {
                    "id": v.id,
                    "cve_id": v.cve_id,
                    "cvss": v.cvss,
                    "severity": v.severity,
                    "description": v.description,
                    "recommendation": v.recommendation,
                    "details": v.details
                }
                for v in vulnerabilities
            ]
        }
        
        json_report = json.dumps(report_data, default=str, indent=2)
        
        return Response(
            content=json_report,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=aegis-report-{scan_id}.json"}
        )
    
    elif format == "csv":
        # Создаем CSV-отчет
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Заголовок CSV
        writer.writerow([
            "CVE ID", "CVSS", "Severity", "Description", "Recommendation"
        ])
        
        # Данные CSV
        for vuln in vulnerabilities:
            writer.writerow([
                vuln.cve_id,
                vuln.cvss,
                vuln.severity,
                vuln.description,
                vuln.recommendation
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=aegis-report-{scan_id}.csv"}
        )
    
    # Этот код не должен выполняться из-за валидации параметра format
    raise HTTPException(status_code=400, detail="Invalid format specified") 
