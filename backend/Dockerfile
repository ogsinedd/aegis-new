FROM python:3.11-slim

WORKDIR /app

# Установка зависимостей и создание директории для логов в одном слое
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    mkdir -p logs

# Копирование исходного кода
COPY . .

# Порт для API
ENV PORT=8000
EXPOSE ${PORT}

# Запуск приложения
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 
