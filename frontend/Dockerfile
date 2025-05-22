# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
# The `VITE_API_URL` will be passed during docker-compose build or runtime if needed for build step,
# but for client-side code, it's better to use runtime env variables.
RUN npm run build

# Stage 2: Serve the application with a lightweight server (e.g., Caddy or Nginx)
# Using Caddy for simplicity and auto HTTPS (though for internal Docker network, HTTP is fine)
FROM caddy:2-alpine

WORKDIR /srv

# Copy the built static files from the build stage
COPY --from=build /app/dist .

# Caddyfile to serve the static files and handle SPA routing
# For SPA, all requests not matching a file should go to index.html
COPY Caddyfile .

# Expose the port Caddy will listen on (default is 80 for HTTP, 443 for HTTPS)
# The docker-compose.yml maps 3000 on the host to this container's port (e.g. 80)
# Caddy by default serves on port 80 if not specified otherwise in Caddyfile.

# Command to run Caddy (already default in caddy image, but can be explicit)
# CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"] 
