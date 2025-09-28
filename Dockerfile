# Stage 1: Build the app
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci

# Copy source files and build
COPY . .
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS runner

WORKDIR /app

ARG PORT=3000
ENV PORT=${PORT}

# Copy only needed files from builder
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled dist from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE ${PORT}

# Start the app
CMD ["node", "dist/main.js"]
