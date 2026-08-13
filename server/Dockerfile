# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy node_modules and code from builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Expose server port
EXPOSE 3000

# Run server as non-root node user
USER node

CMD ["node", "src/server.js"]
