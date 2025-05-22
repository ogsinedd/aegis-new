#!/bin/bash

# Проверка наличия docker и docker-compose
if ! command -v docker &> /dev/null; then
    echo "Docker не установлен. Установите Docker перед запуском этого скрипта."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose не установлен. Установите Docker Compose перед запуском этого скрипта."
    exit 1
fi

# Создание .env файла, если его нет
if [ ! -f .env ]; then
    echo "Создание .env файла..."
    cat > .env << EOL
# База данных
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=aegis
POSTGRES_PORT=5432

# Backend
BACKEND_PORT=8000
DATABASE_URL=postgresql://postgres:postgres@db:5432/aegis

# Sidecar агент
SIDECAR_PORT=5000
EOL
    echo ".env файл создан!"
fi

# Настройка прав для Docker socket
if [ -e /var/run/docker.sock ]; then
    echo "Настройка прав для Docker socket..."
    sudo chmod 666 /var/run/docker.sock
fi

# Сборка и запуск контейнеров
echo "Сборка и запуск контейнеров..."
docker-compose build --no-cache
docker-compose up -d

# Проверка статуса контейнеров
echo "Проверка статуса контейнеров..."
docker-compose ps

echo "Настройка завершена! Приложение доступно по адресу: http://localhost:3000" 
