from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse
import asyncio
from loguru import logger

from app.db.base import get_db
from app.schemas.container import Container
from app.services.container_service import ContainerService
from app.services.host_service import HostService

router = APIRouter()

@router.get("/{host_id}/containers", response_model=List[Container])
async def get_containers(
    host_id: str,
    refresh: bool = False,
    db: Session = Depends(get_db)
):
    """Получение списка контейнеров для хоста"""
    # Проверяем, существует ли хост
    db_host = HostService.get_host(db, host_id=host_id)
    if db_host is None:
        raise HTTPException(status_code=404, detail="Host not found")
    
    if refresh:
        # Если требуется обновление, запрашиваем актуальные данные с хоста
        try:
            containers_data = await ContainerService.get_containers_from_host(db_host)
            if containers_data:
                # Синхронизируем контейнеры в БД
                containers = ContainerService.sync_containers(db, host_id, containers_data)
                return containers
        except Exception as e:
            logger.error(f"Error refreshing containers for host {host_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error refreshing containers: {str(e)}")
    
    # Возвращаем контейнеры из БД
    containers = ContainerService.get_containers_by_host(db, host_id)
    return containers

@router.get("/stream")
async def stream_containers(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """SSE-поток для получения обновлений о контейнерах в реальном времени"""
    async def event_generator():
        while True:
            # Здесь будет логика для обновления контейнеров
            # и отправки событий при изменениях
            hosts = HostService.get_hosts(db)
            
            for host in hosts:
                try:
                    containers_data = await ContainerService.get_containers_from_host(host)
                    if containers_data:
                        # Синхронизируем контейнеры в БД
                        containers = ContainerService.sync_containers(db, host.id, containers_data)
                        # Отправляем обновление клиенту
                        yield {
                            "event": "container_update",
                            "id": host.id,
                            "data": {
                                "host_id": host.id,
                                "host_name": host.name,
                                "updated_at": str(asyncio.get_event_loop().time()),
                                "container_count": len(containers)
                            }
                        }
                except Exception as e:
                    logger.error(f"Error streaming containers for host {host.id}: {str(e)}")
            
            # Пауза между обновлениями
            await asyncio.sleep(5)
    
    return EventSourceResponse(event_generator()) 
