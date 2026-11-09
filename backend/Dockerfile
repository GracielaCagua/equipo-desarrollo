FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY sql ./sql
EXPOSE 3000
# Aplica migraciones pendientes y arranca la API
CMD ["sh", "-c", "node src/db/migrate.js && node src/server.js"]
