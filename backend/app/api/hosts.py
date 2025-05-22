from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from loguru import logger

from app.db.base import get_db
from app.schemas.host import Host, HostCreate, HostUpdate
from app.services.host_service import HostService

router = APIRouter()

@router.get("/", response_model=List[Host])
def get_hosts(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """Получение списка всех хостов"""
    hosts = HostService.get_hosts(db, skip=skip, limit=limit)
    return hosts

@router.post("/", response_model=Host)
def create_host(
    host: HostCreate, 
    db: Session = Depends(get_db)
):
    """Создание нового хоста"""
    return HostService.create_host(db=db, host=host)

@router.get("/{host_id}", response_model=Host)
def get_host(
    host_id: str, 
    db: Session = Depends(get_db)
):
    """Получение информации о хосте по ID"""
    db_host = HostService.get_host(db, host_id=host_id)
    if db_host is None:
        raise HTTPException(status_code=404, detail="Host not found")
    return db_host

@router.put("/{host_id}", response_model=Host)
def update_host(
    host_id: str, 
    host: HostUpdate, 
    db: Session = Depends(get_db)
):
    """Обновление информации о хосте"""
    db_host = HostService.update_host(db, host_id=host_id, host_update=host)
    if db_host is None:
        raise HTTPException(status_code=404, detail="Host not found")
    return db_host

@router.delete("/{host_id}", response_model=bool)
def delete_host(
    host_id: str, 
    db: Session = Depends(get_db)
):
    """Удаление хоста"""
    result = HostService.delete_host(db, host_id=host_id)
    if not result:
        raise HTTPException(status_code=404, detail="Host not found")
    return True 
