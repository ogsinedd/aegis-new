from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from loguru import logger
from pydantic import BaseModel

from app.db.base import get_db
from app.models.models import Vulnerability

router = APIRouter()

class RemediationRequest(BaseModel):
    vulnerability_id: str
    strategy_id: str
    parallelism: int = 1

class RemediationResponse(BaseModel):
    success: bool
    message: str
    details: Dict[str, Any] = {}

# Доступные стратегии исправления
REMEDIATION_STRATEGIES = {
    "hot-patch": {
        "name": "Hot Patch",
        "description": "Применение патча без перезапуска контейнера",
        "estimated_time": 30,  # в секундах
    },
    "rolling-update": {
        "name": "Rolling Update", 
        "description": "Обновление контейнеров по одному",
        "estimated_time": 120,  # в секундах
    },
    "restart": {
        "name": "Restart",
        "description": "Перезапуск контейнера с обновленным образом",
        "estimated_time": 60,  # в секундах
    },
}

@router.get("/strategies")
async def get_remediation_strategies():
    """Получение доступных стратегий исправления"""
    return REMEDIATION_STRATEGIES

@router.post("/", response_model=RemediationResponse)
async def apply_remediation(
    request: RemediationRequest,
    db: Session = Depends(get_db)
):
    """
    Применение стратегии исправления для уязвимости
    - **vulnerability_id**: ID уязвимости
    - **strategy_id**: ID стратегии исправления
    - **parallelism**: Параллелизм (для стратегий с множественными контейнерами)
    """
    # Проверяем существование уязвимости
    vulnerability = db.query(Vulnerability).filter(Vulnerability.id == request.vulnerability_id).first()
    if not vulnerability:
        raise HTTPException(status_code=404, detail="Vulnerability not found")
    
    # Проверяем существование стратегии
    if request.strategy_id not in REMEDIATION_STRATEGIES:
        raise HTTPException(status_code=404, detail="Remediation strategy not found")
    
    strategy = REMEDIATION_STRATEGIES[request.strategy_id]
    
    # Получаем данные скана и контейнера для этой уязвимости
    scan = vulnerability.scan
    
    # Имитация применения стратегии (в реальной системе здесь будет логика применения)
    logger.info(f"Applying {strategy['name']} strategy to vulnerability {vulnerability.cve_id}")
    
    # Возвращаем успешный результат
    return RemediationResponse(
        success=True,
        message=f"Применена стратегия {strategy['name']} для уязвимости {vulnerability.cve_id}",
        details={
            "strategy": strategy["name"],
            "vulnerability": vulnerability.cve_id,
            "container_id": scan.container_id,
            "host_id": scan.host_id
        }
    ) 
