import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger
import logging

from app.api.api import api_router
from app.core.config import settings
from app.db.base import Base, engine

# Настройка логирования
class InterceptHandler(logging.Handler):
    def emit(self, record):
        logger_opt = logger.opt(depth=6, exception=record.exc_info)
        logger_opt.log(record.levelname, record.getMessage())

# Настройка Loguru
logger.remove()
log_level = getattr(settings, "LOG_LEVEL", "INFO").upper()
logger.add("logs/app.log", rotation="10 MB", level=log_level)
logger.add(lambda msg: print(msg, end=""), level=log_level)

# Перехват всех логов стандартной библиотеки logging
logging.basicConfig(handlers=[InterceptHandler()], level=0)

# Создание таблиц в базе данных при запуске
Base.metadata.create_all(bind=engine)

# Инициализация FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API для ручного сканирования уязвимостей Docker-контейнеров",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение API роутеров
app.include_router(api_router, prefix=settings.API_V1_STR)

# Если есть директория с собранным фронтендом, подключаем её
frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")

@app.get("/health")
def health_check():
    """Эндпоинт для проверки состояния сервиса"""
    return {"status": "ok", "service": settings.PROJECT_NAME}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=settings.DEBUG
    ) 
