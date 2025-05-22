FROM alpine:3.18 AS base

# Устанавливаем Node.js и npm
RUN apk add --no-cache nodejs npm bash

# Этап установки зависимостей
FROM base AS deps
WORKDIR /app

# Копируем только файл package.json
COPY package.json ./

# Подготовка необходимых файлов и установка зависимостей в одном слое
RUN mkdir -p src/lib src/components/ui \
    && echo 'import { type ClassValue, clsx } from "clsx";' > src/lib/utils.ts \
    && echo 'import { twMerge } from "tailwind-merge";' >> src/lib/utils.ts \
    && echo '' >> src/lib/utils.ts \
    && echo 'export function cn(...inputs: ClassValue[]) {' >> src/lib/utils.ts \
    && echo '  return twMerge(clsx(inputs));' >> src/lib/utils.ts \
    && echo '}' >> src/lib/utils.ts \
    && echo 'module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };' > postcss.config.js \
    && echo 'module.exports = {' > tailwind.config.js \
    && echo '  content: ["./src/**/*.{js,ts,jsx,tsx}"],' >> tailwind.config.js \
    && echo '  darkMode: "class",' >> tailwind.config.js \
    && echo '  theme: { extend: {} },' >> tailwind.config.js \
    && echo '  plugins: [],' >> tailwind.config.js \
    && echo '};' >> tailwind.config.js \
    && npm install --omit=dev --legacy-peer-deps \
    && cp -R node_modules prod_node_modules \
    && npm install --legacy-peer-deps

# Этап сборки приложения
FROM base AS builder
WORKDIR /app

# Копируем зависимости и подготовленные файлы из предыдущего шага
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/src ./src
COPY --from=deps /app/postcss.config.js ./
COPY --from=deps /app/tailwind.config.js ./

# Копируем исходный код и выполняем сборку в одном слое
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN echo "NEXT_PUBLIC_API_URL=http://backend:8000/v1" > .env.production \
    && npm run build || (cat .next/error.log && exit 1)

# Финальный образ
FROM base AS runner
WORKDIR /app

# Настройка переменных окружения и пользователя в одном слое
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Создаем непривилегированного пользователя и директории в одном слое
RUN addgroup -S -g 1001 nodejs \
    && adduser -S -u 1001 -G nodejs nextjs \
    && mkdir -p /app/.next \
    && chown -R nextjs:nodejs /app

# Копируем только необходимые файлы из этапа сборки
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=deps --chown=nextjs:nodejs /app/prod_node_modules ./node_modules

# Переключаемся на непривилегированного пользователя
USER nextjs

# Настройка порта и запуск
EXPOSE 3000
CMD ["node", "server.js"] 
