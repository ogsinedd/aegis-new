FROM alpine:3.18 AS base

# Устанавливаем Node.js и npm
RUN apk add --no-cache nodejs npm bash

# Этап установки зависимостей
FROM base AS deps
WORKDIR /app

# Копируем файлы пакета
COPY package.json ./

# Установка зависимостей
RUN npm install --legacy-peer-deps && \
    cp -R node_modules prod_node_modules

# Этап сборки приложения
FROM base AS builder
WORKDIR /app

# Копируем зависимости
COPY --from=deps /app/node_modules ./node_modules

# Копируем исходный код
COPY . .

# Отключаем телеметрию Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Создаем файл .env.production с переменными окружения
RUN echo "NEXT_PUBLIC_API_URL=http://backend:8000/v1" > .env.production

# Выполняем сборку приложения
RUN npm run build || (cat .next/error.log && exit 1)

# Финальный образ
FROM base AS runner
WORKDIR /app

# Настройка переменных окружения
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Создаем непривилегированного пользователя
RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nextjs && \
    mkdir -p /app/.next && \
    chown -R nextjs:nodejs /app

# Копируем необходимые файлы из этапа сборки
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=deps --chown=nextjs:nodejs /app/prod_node_modules ./node_modules

# Переключаемся на непривилегированного пользователя
USER nextjs

# Настройка порта и запуск
EXPOSE 3000
CMD ["node", "server.js"] 
