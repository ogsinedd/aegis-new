FROM alpine:3.18 AS base

# Устанавливаем Node.js и npm
RUN apk add --no-cache nodejs npm

# Только установка зависимостей
FROM base AS deps
WORKDIR /app

# Копируем файлы package.json и устанавливаем зависимости одной командой
COPY package.json package-lock.json* ./
RUN npm install --force clsx tailwind-merge sonner date-fns axios lucide-react && \
    npm ci --force

# Сборка приложения
FROM base AS builder
WORKDIR /app

# Копируем файлы зависимостей из предыдущего шага
COPY --from=deps /app/node_modules ./node_modules

# Копируем исходный код
COPY . .

# Отключаем телеметрию Next.js
ENV NEXT_TELEMETRY_DISABLED 1

# Создаем необходимые компоненты и выполняем сборку в одном слое
RUN mkdir -p src/lib src/components/ui && \
    if [ ! -f src/lib/utils.ts ]; then \
        echo 'import { type ClassValue, clsx } from "clsx"; \
        import { twMerge } from "tailwind-merge"; \
        export function cn(...inputs: ClassValue[]) { \
          return twMerge(clsx(inputs)); \
        }' > src/lib/utils.ts; \
    fi && \
    npx shadcn@latest init --yes && \
    npx shadcn@latest add badge button card dialog dropdown-menu select tooltip --yes && \
    npm run build

# Производственный образ
FROM base AS runner
WORKDIR /app

# Задаем переменные окружения
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Создаем непривилегированного пользователя и подготавливаем директории в одном слое
RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nextjs && \
    mkdir -p .next && \
    chown -R nextjs:nodejs .next

# Копируем статические файлы и сборку
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Переключаемся на непривилегированного пользователя
USER nextjs

# Настройка порта и запуск
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"] 
