#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log() {
  echo -e "${GREEN}[AEGIS]${NC} $1"
}

error() {
  echo -e "${RED}[ОШИБКА]${NC} $1"
}

warning() {
  echo -e "${YELLOW}[ВНИМАНИЕ]${NC} $1"
}

# Проверка наличия docker и docker-compose
if ! command -v docker &> /dev/null; then
    error "Docker не установлен. Установите Docker перед запуском этого скрипта."
    exit 1
fi

# Проверка на наличие docker compose плагина или docker-compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    error "Docker Compose не установлен. Установите Docker Compose перед запуском этого скрипта."
    exit 1
fi

# Проверка наличия необходимых каталогов
for dir in frontend backend agent; do
    if [ ! -d "$dir" ]; then
        error "Каталог $dir не найден. Убедитесь, что вы находитесь в корневом каталоге проекта."
        exit 1
    fi
done

# Создание .env файла, если его нет
if [ ! -f .env ]; then
    log "Создание .env файла..."
    if [ -f env.example ]; then
        cp env.example .env
        log ".env файл создан из шаблона env.example!"
    else
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

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/v1
EOL
        log ".env файл создан!"
    fi
fi

# Настройка прав для Docker socket
if [ -e /var/run/docker.sock ]; then
    log "Настройка прав для Docker socket..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        warning "На macOS не требуется изменение прав для Docker socket."
    else
        if command -v sudo &> /dev/null; then
            sudo chmod 666 /var/run/docker.sock
        else
            warning "Команда sudo не найдена. Возможно, потребуется вручную установить права для /var/run/docker.sock"
        fi
    fi
fi

# Парсинг аргументов
REBUILD=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --rebuild) REBUILD=true ;;
        *) error "Неизвестный параметр: $1"; exit 1 ;;
    esac
    shift
done

# Проверка наличия папки node_modules во frontend
if [ ! -d "frontend/node_modules" ] || [ "$REBUILD" = true ]; then
    log "Установка зависимостей для фронтенда..."
    (cd frontend && npm install)
fi

# Сборка и запуск контейнеров
log "Сборка и запуск контейнеров..."
if [ "$REBUILD" = true ]; then
    $COMPOSE_CMD build --no-cache
else
    $COMPOSE_CMD build
fi

$COMPOSE_CMD up -d

# Проверка статуса контейнеров
log "Проверка статуса контейнеров..."
$COMPOSE_CMD ps

log "Настройка завершена! Приложение будет доступно по адресу: http://localhost:3000"
log "Backend API доступен по адресу: http://localhost:8000/v1"
log "Локальный агент доступен по адресу: http://localhost:5000" 
