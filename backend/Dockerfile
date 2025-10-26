# Backend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production
COPY src ./src
COPY scripts ./scripts
# Copy wait-for script
COPY scripts/wait-for.sh /wait-for.sh
RUN chmod +x /wait-for.sh
COPY .env ./.env
EXPOSE 4000
CMD ["node", "src/index.js"]
