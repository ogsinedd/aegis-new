FROM alpine:3.18 AS base

# Устанавливаем Node.js и npm
RUN apk add --no-cache nodejs npm bash

# Только установка зависимостей
FROM base AS deps
WORKDIR /app

# Копируем файлы package.json и устанавливаем зависимости
COPY package.json package-lock.json* ./

# Установка зависимостей с кэшированием
RUN npm ci --only=production && \
    cp -R node_modules prod_node_modules && \
    npm ci

# Сборка приложения
FROM base AS builder
WORKDIR /app

# Копируем зависимости из предыдущего шага
COPY --from=deps /app/node_modules ./node_modules

# Копируем весь исходный код
COPY . .

# Отключаем телеметрию Next.js
ENV NEXT_TELEMETRY_DISABLED 1

# Создаем файл .env.production с переменными окружения
RUN echo "NEXT_PUBLIC_API_URL=http://backend:8000/v1" > .env.production

# Проверяем наличие postcss.config.js, и создаем его если отсутствует
RUN if [ ! -f postcss.config.js ]; then \
        echo "module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };" > postcss.config.js; \
    fi

# Выполняем сборку приложения
RUN npm run build || (cat .next/error.log && exit 1)

# Производственный образ
FROM base AS runner
WORKDIR /app

# Задаем переменные окружения
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000

# Создаем непривилегированного пользователя
RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nextjs && \
    mkdir -p /app/.next && \
    chown -R nextjs:nodejs /app

# Копируем только необходимые файлы из builder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=deps --chown=nextjs:nodejs /app/prod_node_modules ./node_modules

# Переключаемся на непривилегированного пользователя
USER nextjs

# Настройка порта и запуск
EXPOSE 3000
CMD ["node", "server.js"] 
