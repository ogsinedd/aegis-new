FROM alpine:3.18 AS base

# Устанавливаем Node.js и npm
RUN apk add --no-cache nodejs npm bash

# Только установка зависимостей
FROM base AS deps
WORKDIR /app

# Копируем файлы package.json и устанавливаем все зависимости одной командой
COPY package.json package-lock.json* ./
RUN npm install --force class-variance-authority clsx tailwind-merge \
    @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
    @radix-ui/react-select @radix-ui/react-tooltip \
    axios date-fns lucide-react sonner \
    tailwindcss postcss autoprefixer @tailwindcss/forms && \
    npm install --force

# Сборка приложения
FROM base AS builder
WORKDIR /app

# Копируем файлы зависимостей из предыдущего шага
COPY --from=deps /app/node_modules ./node_modules

# Копируем исходный код
COPY . .

# Отключаем телеметрию Next.js
ENV NEXT_TELEMETRY_DISABLED 1

# Копируем, запускаем скрипт установки компонентов и выполняем сборку
RUN chmod +x docker-utils/setup-components.sh && \
    ./docker-utils/setup-components.sh && \
    if [ ! -f postcss.config.js ]; then \
        echo "module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };" > postcss.config.js; \
    fi && \
    npm run build || (cat .next/error.log && exit 1)

# Производственный образ
FROM base AS runner
WORKDIR /app

# Задаем переменные окружения
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Создаем непривилегированного пользователя
RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nextjs

# Копируем статические файлы и сборку
COPY --from=builder /app/public ./public
RUN mkdir -p .next && chown nextjs:nodejs .next

# Копируем оптимизированные файлы сборки
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Переключаемся на непривилегированного пользователя
USER nextjs

# Настройка порта и запуск
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"] 
