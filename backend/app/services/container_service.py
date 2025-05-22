from typing import List, Optional, Dict, Any
import httpx
from sqlalchemy.orm import Session
from loguru import logger

from app.core.config import settings
from app.models.models import Container, Host, ContainerStatus
from app.schemas.container import ContainerCreate

class ContainerService:
    @staticmethod
    async def get_containers_from_host(host: Host) -> List[Dict[str, Any]]:
        """Получение списка контейнеров с удаленного хоста через его API"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"http://{host.address}:{host.port}/containers"
                logger.info(f"Fetching containers from host {host.name} at {url}")
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching containers from {host.name}: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Error fetching containers from {host.name}: {str(e)}")
            return []
    
    @staticmethod
    def get_containers_by_host(db: Session, host_id: str) -> List[Container]:
        """Получение списка контейнеров по ID хоста из базы данных"""
        return db.query(Container).filter(Container.host_id == host_id).all()
    
    @staticmethod
    def create_or_update_container(db: Session, container_data: Dict[str, Any], host_id: str) -> Container:
        """Создание или обновление контейнера в базе данных"""
        # Проверяем, существует ли контейнер
        db_container = db.query(Container).filter(
            Container.container_id == container_data["id"],
            Container.host_id == host_id
        ).first()
        
        if db_container:
            # Обновляем существующий контейнер
            db_container.name = container_data["name"]
            db_container.image = container_data["image"]
            # Не меняем статус сканирования если контейнер уже существует
        else:
            # Создаем новый контейнер
            db_container = Container(
                container_id=container_data["id"],
                host_id=host_id,
                name=container_data["name"],
                image=container_data["image"],
                status=ContainerStatus.IDLE
            )
            db.add(db_container)
        
        db.commit()
        db.refresh(db_container)
        return db_container
    
    @staticmethod
    def sync_containers(db: Session, host_id: str, containers_data: List[Dict[str, Any]]) -> List[Container]:
        """Синхронизация контейнеров в базе данных с данными с хоста"""
        # Получаем все текущие контейнеры хоста из БД
        current_containers = {
            c.container_id: c for c in ContainerService.get_containers_by_host(db, host_id)
        }
        
        # Контейнеры для возврата
        result_containers = []
        
        # ID контейнеров, которые существуют на хосте
        container_ids_from_host = set()
        
        # Обновляем существующие и добавляем новые контейнеры
        for container_data in containers_data:
            container_ids_from_host.add(container_data["id"])
            db_container = ContainerService.create_or_update_container(db, container_data, host_id)
            result_containers.append(db_container)
        
        # Удаляем контейнеры, которых больше нет на хосте
        for container_id, container in current_containers.items():
            if container_id not in container_ids_from_host:
                db.delete(container)
        
        db.commit()
        return result_containers
    
    @staticmethod
    def update_container_status(db: Session, container_id: str, host_id: str, status: ContainerStatus) -> Optional[Container]:
        """Обновление статуса контейнера"""
        db_container = db.query(Container).filter(
            Container.container_id == container_id,
            Container.host_id == host_id
        ).first()
        
        if not db_container:
            return None
        
        db_container.status = status
        db.commit()
        db.refresh(db_container)
        logger.info(f"Updated container status: {container_id} to {status.value}")
        return db_container 
