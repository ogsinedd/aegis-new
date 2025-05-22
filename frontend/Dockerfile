FROM alpine:3.18 AS base

# Устанавливаем Node.js и npm
RUN apk add --no-cache nodejs npm bash

# Только установка зависимостей
FROM base AS deps
WORKDIR /app

# Копируем файлы package.json
COPY package.json package-lock.json* ./

# Устанавливаем все необходимые зависимости
RUN npm install --force class-variance-authority clsx tailwind-merge
RUN npm install --force @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu
RUN npm install --force @radix-ui/react-select @radix-ui/react-tooltip
RUN npm install --force axios date-fns lucide-react sonner
RUN npm install --force

# Сборка приложения
FROM base AS builder
WORKDIR /app

# Копируем файлы зависимостей из предыдущего шага
COPY --from=deps /app/node_modules ./node_modules

# Копируем исходный код
COPY . .

# Отключаем телеметрию Next.js
ENV NEXT_TELEMETRY_DISABLED 1

# Копируем и запускаем скрипт установки компонентов
COPY docker-utils/setup-components.sh /tmp/
RUN chmod +x /tmp/setup-components.sh
RUN /tmp/setup-components.sh

# Выполняем сборку приложения
RUN npm run build || (cat .next/error.log && exit 1)

# Производственный образ
FROM base AS runner
WORKDIR /app

# Задаем переменные окружения
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Создаем непривилегированного пользователя
RUN addgroup -S -g 1001 nodejs
RUN adduser -S -u 1001 -G nodejs nextjs

# Копируем статические файлы и сборку
COPY --from=builder /app/public ./public
RUN mkdir -p .next
RUN chown nextjs:nodejs .next

# Копируем оптимизированные файлы сборки
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Переключаемся на непривилегированного пользователя
USER nextjs

# Настройка порта и запуск
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"] 
