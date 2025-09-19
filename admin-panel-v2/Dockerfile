FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

EXPOSE 56842

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy application code
COPY . .

# Build the application if build script exists
RUN npm run build 2>/dev/null || echo "No build script found, skipping build"

# Create logs directory
RUN mkdir -p logs

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:56842/health || exit 1

# Start the admin panel server
CMD ["node", "api-server.js"]