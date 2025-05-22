from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.services.remediation_service import RemediationService

router = APIRouter()

class RemediationStrategy(BaseModel):
    id: str
    name: str
    description: str
    estimated_time: int  # в секундах

class RemediationRequest(BaseModel):
    scan_id: str
    vulnerability_id: Optional[str] = None
    strategy: str  # hot-patch, rolling-update, restart

class DowntimeEstimate(BaseModel):
    estimated_time: int  # в секундах
    affected_containers: int
    strategy: str

@router.get("/strategies", response_model=List[RemediationStrategy])
async def get_remediation_strategies():
    """Получить список доступных стратегий для исправления уязвимостей"""
    return [
        RemediationStrategy(
            id="hot-patch",
            name="Hot Patch",
            description="Применение патча без перезапуска контейнера",
            estimated_time=60  # 1 минута
        ),
        RemediationStrategy(
            id="rolling-update",
            name="Rolling Update",
            description="Обновление контейнеров по одному, с минимизацией простоя",
            estimated_time=180  # 3 минуты
        ),
        RemediationStrategy(
            id="restart",
            name="Restart",
            description="Полная остановка и перезапуск контейнера с обновленным образом",
            estimated_time=120  # 2 минуты
        )
    ]

@router.post("/estimate", response_model=DowntimeEstimate)
async def estimate_downtime(
    request: RemediationRequest,
    db: Session = Depends(get_db)
):
    """Оценить предполагаемое время простоя для выбранной стратегии исправления"""
    remediation_service = RemediationService(db)
    
    # Получаем стратегию
    strategies = await get_remediation_strategies()
    strategy = next((s for s in strategies if s.id == request.strategy), None)
    
    if not strategy:
        raise HTTPException(status_code=400, detail=f"Unknown strategy: {request.strategy}")
    
    # Получаем количество затрагиваемых контейнеров
    affected_containers = remediation_service.get_affected_containers_count(
        scan_id=request.scan_id,
        vulnerability_id=request.vulnerability_id
    )
    
    # Получаем параметр parallelism из конфигурации
    parallelism = remediation_service.get_parallelism()
    
    # Вычисляем общее время в зависимости от стратегии и параллелизма
    batches = (affected_containers + parallelism - 1) // parallelism  # округление вверх
    total_time = batches * strategy.estimated_time
    
    return DowntimeEstimate(
        estimated_time=total_time,
        affected_containers=affected_containers,
        strategy=strategy.name
    )

@router.post("/apply")
async def apply_remediation(
    request: RemediationRequest,
    db: Session = Depends(get_db)
):
    """Применить выбранную стратегию исправления уязвимостей"""
    remediation_service = RemediationService(db)
    
    # Проверяем, что стратегия существует
    strategies = await get_remediation_strategies()
    strategy = next((s for s in strategies if s.id == request.strategy), None)
    
    if not strategy:
        raise HTTPException(status_code=400, detail=f"Unknown strategy: {request.strategy}")
    
    # Запускаем процесс исправления
    result = remediation_service.apply_remediation(
        scan_id=request.scan_id,
        vulnerability_id=request.vulnerability_id,
        strategy=request.strategy
    )
    
    return {
        "success": True,
        "message": f"Started applying {strategy.name} remediation",
        "details": result
    } 
