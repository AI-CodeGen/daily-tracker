# Backend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production --no-audit --no-fund || npm install --production --no-audit --no-fund
COPY src ./src
COPY scripts ./scripts
COPY .env ./.env
EXPOSE 4000
CMD ["node", "src/index.js"]
