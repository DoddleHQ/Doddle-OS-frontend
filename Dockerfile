# Stage 1: Dependencies and Build
FROM node:20-alpine AS deps

# Install dependencies only when needed
FROM deps AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production Image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
# Create public directory first to avoid errors if it doesn't exist in builder
RUN mkdir -p ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Copy public directory if it exists
RUN if [ -d "/app/.next/standalone/public" ]; then \
      cp -r /app/.next/standalone/public ./public || true; \
    fi

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "127.0.0.1"

CMD ["node", "server.js"]
