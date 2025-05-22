from typing import List, Optional
from sqlalchemy.orm import Session
from loguru import logger

from app.models.models import Host
from app.schemas.host import HostCreate, HostUpdate

class HostService:
    @staticmethod
    def get_hosts(db: Session, skip: int = 0, limit: int = 100) -> List[Host]:
        """Получение списка всех хостов"""
        return db.query(Host).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_host(db: Session, host_id: str) -> Optional[Host]:
        """Получение хоста по ID"""
        return db.query(Host).filter(Host.id == host_id).first()
    
    @staticmethod
    def create_host(db: Session, host: HostCreate) -> Host:
        """Создание нового хоста"""
        db_host = Host(
            name=host.name,
            address=host.address,
            port=host.port,
            description=host.description
        )
        db.add(db_host)
        db.commit()
        db.refresh(db_host)
        logger.info(f"Created new host: {db_host.name} ({db_host.id})")
        return db_host
    
    @staticmethod
    def update_host(db: Session, host_id: str, host_update: HostUpdate) -> Optional[Host]:
        """Обновление хоста"""
        db_host = HostService.get_host(db, host_id)
        if not db_host:
            return None
        
        update_data = host_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_host, key, value)
        
        db.commit()
        db.refresh(db_host)
        logger.info(f"Updated host: {db_host.name} ({db_host.id})")
        return db_host
    
    @staticmethod
    def delete_host(db: Session, host_id: str) -> bool:
        """Удаление хоста"""
        db_host = HostService.get_host(db, host_id)
        if not db_host:
            return False
        
        db.delete(db_host)
        db.commit()
        logger.info(f"Deleted host: {host_id}")
        return True 
