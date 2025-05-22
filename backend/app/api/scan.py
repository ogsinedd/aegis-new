from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from loguru import logger

from app.db.base import get_db
from app.schemas.scan import ScanRequest, ScanHistory, ScanResult, Vulnerability
from app.services.scan_service import ScanService

router = APIRouter()

@router.post("/", response_model=ScanHistory)
async def start_scan(
    scan_request: ScanRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Запуск нового сканирования контейнера"""
    db_scan = await ScanService.start_scan(db, scan_request)
    if db_scan is None:
        raise HTTPException(status_code=404, detail="Host or container not found")
    return db_scan

@router.get("/{scan_id}", response_model=ScanResult)
async def get_scan_status(
    scan_id: str,
    db: Session = Depends(get_db)
):
    """Получение статуса и результатов сканирования"""
    # Проверяем статус сканирования на удаленном хосте
    db_scan = await ScanService.check_scan_status(db, scan_id)
    if db_scan is None:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    # Получаем уязвимости для этого сканирования
    vulnerabilities = ScanService.get_vulnerabilities(db, scan_id=scan_id)
    
    # Создаем объект результата
    result = ScanResult(
        scan_id=db_scan.scan_id,
        host_id=db_scan.host_id,
        container_id=db_scan.container_id,
        status=db_scan.status.value,
        started_at=db_scan.started_at,
        finished_at=db_scan.finished_at,
        vulnerabilities=vulnerabilities
    )
    
    return result

@router.get("/history", response_model=List[ScanHistory])
def get_scan_history(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """Получение истории сканирований"""
    history = ScanService.get_scan_history(db, skip=skip, limit=limit)
    return history

@router.get("/vulnerabilities", response_model=List[Vulnerability])
def get_vulnerabilities(
    scan_id: Optional[str] = None,
    host_id: Optional[str] = None,
    container_id: Optional[str] = None,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """Получение списка уязвимостей с фильтрацией"""
    vulnerabilities = ScanService.get_vulnerabilities(
        db, 
        scan_id=scan_id,
        host_id=host_id,
        container_id=container_id,
        skip=skip, 
        limit=limit
    )
    return vulnerabilities 
