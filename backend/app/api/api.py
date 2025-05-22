from fastapi import APIRouter
from app.api import hosts, containers, scan, remediation

api_router = APIRouter()

# Подключаем эндпоинты для управления хостами
api_router.include_router(
    hosts.router,
    prefix="/hosts",
    tags=["hosts"]
)

# Подключаем эндпоинты для управления контейнерами
api_router.include_router(
    containers.router,
    prefix="/hosts",
    tags=["containers"]
)

# Дополнительный роутер для стриминга контейнеров
api_router.include_router(
    containers.router,
    prefix="/containers",
    tags=["containers"]
)

# Подключаем эндпоинты для управления сканированием
api_router.include_router(
    scan.router,
    prefix="/scan",
    tags=["scan"]
)

# Подключаем эндпоинты для управления исправлением
api_router.include_router(
    remediation.router,
    prefix="/remediation",
    tags=["remediation"]
) 
