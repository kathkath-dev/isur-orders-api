FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
# Commit del que se construyó la imagen (lo informa /version)
ARG GIT_SHA=local
ENV GIT_SHA=$GIT_SHA
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY scripts ./scripts
COPY db ./db
USER app
EXPOSE 3000
CMD ["node", "src/server.js"]
