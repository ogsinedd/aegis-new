# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
# The `VITE_API_URL` will be passed during docker-compose build or runtime if needed for build step,
# but for client-side code, it's better to use runtime env variables.
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
