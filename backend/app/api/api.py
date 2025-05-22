from fastapi import APIRouter

from app.api.endpoints import hosts, containers, scan, vulnerabilities, remediation

api_router = APIRouter()

# Подключаем эндпоинты для управления хостами
api_router.include_router(hosts.router, prefix="/hosts", tags=["hosts"])

# Подключаем эндпоинты для управления контейнерами на конкретном хосте
api_router.include_router(
    containers.router,
    prefix="/hosts/{host_id}/containers", 
    tags=["containers"]
)

# Подключаем эндпоинты для сканирования
api_router.include_router(scan.router, prefix="/scan", tags=["scan"])

# Подключаем эндпоинты для уязвимостей
api_router.include_router(vulnerabilities.router, prefix="/vulnerabilities", tags=["vulnerabilities"])

# Подключаем эндпоинты для исправления уязвимостей
api_router.include_router(remediation.router, prefix="/remediation", tags=["remediation"]) 
