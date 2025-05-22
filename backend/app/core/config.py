import os
from typing import List, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Настройки проекта
    PROJECT_NAME: str = "Aegis"
    API_V1_STR: str = "/v1"
    DEBUG: bool = False
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    # Секретный ключ
    SECRET_KEY: str = "changeme"
    
    # База данных PostgreSQL
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "aegis"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    
    # Настройки бэкэнда
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    
    # Настройки sidecar-агента
    SIDECAR_PORT: int = 5000
    
    # Логирование
    LOG_LEVEL: str = "info"
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        """Получение строки подключения к базе данных"""
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            try:
                v = eval(v)  # Безопасно для списков в строковом формате
                if isinstance(v, list):
                    return v
            except:
                return [i.strip() for i in v.split(",")]
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Создаем экземпляр настроек
settings = Settings() 
