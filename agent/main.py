import os
import uuid
import json
import asyncio
import docker
import subprocess
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from enum import Enum
from datetime import datetime

# Модели данных
class ContainerInfo(BaseModel):
    id: str
    name: str
    image: str
    status: str

class ScanRequest(BaseModel):
    container_id: str

class ScanStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"

class ScanResult(BaseModel):
    scan_id: str
    container_id: str
    status: ScanStatus
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    results: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Настройки и переменные
SCAN_CONCURRENCY = int(os.getenv("SCAN_CONCURRENCY", "2"))
scan_semaphore = asyncio.Semaphore(SCAN_CONCURRENCY)
scan_tasks: Dict[str, ScanResult] = {}

# Инициализация FastAPI
app = FastAPI(title="Aegis Sidecar Agent")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Инициализация клиента Docker
os.environ['DOCKER_HOST'] = 'unix:///var/run/docker.sock'
docker_client = docker.from_env()

@app.get("/")
async def read_root():
    return {"status": "ok", "service": "Aegis Sidecar Agent"}

@app.get("/containers", response_model=List[ContainerInfo])
async def list_containers():
    """Получение списка всех контейнеров на хосте"""
    try:
        containers = docker_client.containers.list(all=True)
        result = []
        
        for container in containers:
            names = container.name if isinstance(container.name, str) else container.name[0]
            result.append(
                ContainerInfo(
                    id=container.id,
                    name=names,
                    image=container.image.tags[0] if container.image.tags else container.image.id,
                    status=container.status
                )
            )
        
        return result
    except Exception as e:
        logger.error(f"Error listing containers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing containers: {str(e)}")

@app.post("/scan", response_model=ScanResult)
async def start_scan(scan_request: ScanRequest, background_tasks: BackgroundTasks):
    """Запуск сканирования контейнера Trivy"""
    try:
        # Проверяем существование контейнера
        try:
            container = docker_client.containers.get(scan_request.container_id)
        except docker.errors.NotFound:
            raise HTTPException(status_code=404, detail=f"Container {scan_request.container_id} not found")
        
        # Генерируем уникальный ID для сканирования
        scan_id = str(uuid.uuid4())
        
        # Определяем образ контейнера
        image_name = container.image.tags[0] if container.image.tags else container.image.id
        
        # Создаем запись о сканировании
        scan_result = ScanResult(
            scan_id=scan_id,
            container_id=scan_request.container_id,
            status=ScanStatus.PENDING,
            started_at=datetime.now()
        )
        
        scan_tasks[scan_id] = scan_result
        
        # Запускаем сканирование в фоновом режиме
        background_tasks.add_task(
            perform_scan, 
            scan_id=scan_id, 
            image_name=image_name
        )
        
        return scan_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting scan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting scan: {str(e)}")

@app.get("/scan/{scan_id}", response_model=ScanResult)
async def get_scan_status(scan_id: str):
    """Получение статуса и результатов сканирования"""
    if scan_id not in scan_tasks:
        raise HTTPException(status_code=404, detail=f"Scan {scan_id} not found")
    
    return scan_tasks[scan_id]

async def perform_scan(scan_id: str, image_name: str):
    """Выполнение сканирования с использованием Trivy"""
    async with scan_semaphore:
        try:
            # Обновляем статус
            scan_tasks[scan_id].status = ScanStatus.RUNNING
            
            # Подготавливаем команду Trivy
            trivy_cmd = [
                "trivy", 
                "image", 
                "--format", "json", 
                "--quiet",
                image_name
            ]
            
            logger.info(f"Running Trivy scan for image {image_name}, scan_id: {scan_id}")
            
            # Запускаем Trivy и захватываем вывод
            process = subprocess.Popen(
                trivy_cmd, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE
            )
            stdout, stderr = process.communicate()
            
            if process.returncode != 0:
                logger.error(f"Trivy scan failed: {stderr.decode()}")
                scan_tasks[scan_id].status = ScanStatus.ERROR
                scan_tasks[scan_id].error = stderr.decode()
            else:
                # Парсим JSON-вывод Trivy
                try:
                    results = json.loads(stdout.decode())
                    scan_tasks[scan_id].results = results
                    scan_tasks[scan_id].status = ScanStatus.COMPLETED
                except json.JSONDecodeError as e:
                    logger.error(f"Error parsing Trivy output: {str(e)}")
                    scan_tasks[scan_id].status = ScanStatus.ERROR
                    scan_tasks[scan_id].error = f"Error parsing Trivy output: {str(e)}"
            
            # Обновляем время завершения
            scan_tasks[scan_id].finished_at = datetime.now()
            
        except Exception as e:
            logger.error(f"Error during scan execution: {str(e)}")
            scan_tasks[scan_id].status = ScanStatus.ERROR
            scan_tasks[scan_id].error = str(e)
            scan_tasks[scan_id].finished_at = datetime.now()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("SIDECAR_PORT", "5000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True) 
