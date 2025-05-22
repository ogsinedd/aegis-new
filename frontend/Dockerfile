# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Сначала копируем все файлы проекта
COPY . .

# Затем устанавливаем зависимости
RUN npm install

# Проверяем наличие важных файлов
RUN ls -la src/lib/utils.ts && \
    echo "utils.ts exists" || \
    echo "utils.ts not found"

# Собираем приложение
RUN npm run build

# Stage 2: Serve the application with Caddy
FROM caddy:2-alpine

WORKDIR /srv

# Copy the built static files from the build stage
COPY --from=build /app/dist .

# Copy Caddyfile for SPA routing
COPY Caddyfile .

# Expose port 80 (HTTP)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Command to run Caddy (already default in caddy image, but can be explicit)
# CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"] 
