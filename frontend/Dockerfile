FROM node:20-alpine AS base

# Установка дополнительных инструментов
RUN apk add --no-cache bash

# Установка рабочей директории
WORKDIR /app

# Этап установки зависимостей
FROM base AS deps

# Копируем файлы для установки зависимостей
COPY package.json .npmrc ./

# Установка зависимостей с учетом производственного режима
# Используем npm install вместо npm ci, чтобы пересоздать package-lock.json
RUN npm install --no-fund --no-audit

# Этап сборки приложения
FROM base AS builder

# Копируем файлы проекта
COPY . .

# Проверяем, что файл utils.ts существует
RUN test -f src/lib/utils.ts || (echo "ERROR: utils.ts not found! Creating it..." && mkdir -p src/lib && echo "import { type ClassValue, clsx } from \"clsx\"\nimport { twMerge } from \"tailwind-merge\"\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs))\n}" > src/lib/utils.ts)

# Копируем зависимости
COPY --from=deps /app/node_modules ./node_modules

# Отключаем телеметрию Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Создаем файл .env.production с переменными окружения
RUN echo "NEXT_PUBLIC_API_URL=http://backend:8000/v1" > .env.production

# Выполняем сборку приложения (в Next.js 'standalone' уже установлен в next.config.js)
RUN npm run build

# Проверяем, что standalone директория была создана
RUN test -d .next/standalone || (echo "ERROR: Standalone output not generated!" && exit 1)

# Финальный образ
FROM base AS runner

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

# Переключаемся на непривилегированного пользователя
USER nextjs

# Настройка порта и запуск
EXPOSE 3000
CMD ["node", "server.js"] 
