# Daily Tracker

Full-stack application to track financial indices and commodities (e.g., Nifty, Sensex, Gold, Silver) with configurable assets, thresholds, and email alerts.

## Features
- Dashboard with live (30‑min refresh) data cards & mini charts
- Configuration screen: add/remove assets, manage thresholds, inline threshold editing
- Duplicate symbol validation (on blur) + API driven duplicate check
- Page size selector, pagination, sorting & search for assets
- Batch CSV import for assets (text/plain upload)
- 30‑minute scheduler fetching data (Yahoo Finance public endpoints)
- Historical snapshots persisted (MongoDB), served via REST
- SSE stream for real-time threshold alert events
- Persisted alert history with filtering & pagination
- Threshold-based email alerts (upper/lower) via SMTP (cooldown logic)
- Secure Express setup: CORS (restricted), Helmet, rate limiting, Joi validation
- Dockerized frontend (React + Vite + TS + Tailwind + Recharts) and backend (Node + Express + MongoDB)

## Tech Stack
Frontend: React, Vite, TypeScript, TailwindCSS, Recharts, Axios
Backend: Node.js, Express, MongoDB (Mongoose), node-cron, Axios, Nodemailer

## Monorepo Structure
```
/daily-tracker-7Oct
  docker-compose.yml
  backend/
  frontend/
```

## Environment Variables
Create `backend/.env` from `.env.example`:
```
PORT=4000
MONGO_URI=mongodb://mongo:27017/dailytracker
ALLOWED_ORIGINS=http://localhost:5173
CRON_EXPR=*/30 * * * *
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=changeme
ALERT_EMAIL_TO=alerts@example.com
```

## Running Locally (without Docker)
1. Start Mongo locally or with Docker: `docker run -d -p 27017:27017 --name dt-mongo mongo:6`
2. Backend:
```
cd backend
npm install
cp .env.example .env  # edit as needed
npm run seed
npm run dev
```
3. Frontend:
```
cd ../frontend
npm install
npm run dev
```
4. Open http://localhost:5173

## Docker Compose
```
docker compose up --build
```
Frontend: http://localhost:5173 (served via Vite dev or Nginx in prod build)
Backend: http://localhost:4000/api
Docs UI: http://localhost:4000/docs  (raw spec: /docs.json)

## API Overview
```
GET  /api/health
GET  /api/assets              # list configured assets
POST /api/assets              # add asset { symbol,name,providerSymbol,upperThreshold,lowerThreshold }
PUT  /api/assets/:id          # update thresholds or name
DELETE /api/assets/:id        # remove asset
GET  /api/quotes/current      # current snapshot for all assets
GET  /api/quotes/:id/history?limit=200                 # historical snapshots (by asset id)
GET  /api/alerts/history?symbol=&boundary=&page=&pageSize=   # alert history
GET  /api/assets?symbolExact=SYM                      # duplicate symbol existence check
POST /api/assets/batch (text/plain CSV)               # batch asset import
```

## Data Model Simplified
- Asset: { name, symbol, providerSymbol, upperThreshold, lowerThreshold, lastAlertedAt, createdAt }
- Snapshot: { asset, price, changePercent, raw, takenAt }
- AlertHistory: { asset, symbol, name, boundary, price, threshold, triggeredAt }

## Alerts & SSE
When a fetched price crosses upper or lower thresholds (honoring a cooldown), an email is sent and an SSE event is emitted to connected dashboards. Events are also stored in `AlertHistory` for later review.

## Notes
- Yahoo Finance symbols containing special chars are URL encoded (e.g., `^NSEI` for Nifty 50, `^BSESN` for Sensex)
- Mini charts use recent snapshots (last 10) per asset
- Extend provider logic in `fetch.service.js`

## Testing
Backend tests run against an in‑memory MongoDB (mongodb-memory-server) with native ESM enabled.

Install & run:
```
cd backend
npm install
npm test          # uses NODE_OPTIONS=--experimental-vm-modules
npm run test:watch
```

## API Documentation (Swagger UI)
After starting the backend you can explore and execute endpoints interactively at:

http://localhost:4000/docs

The raw OpenAPI spec (for codegen or client tooling) is available at:

http://localhost:4000/docs.json

If /docs returns 404, ensure the server was restarted after adding the documentation and that `openapi.yaml` exists under `backend/`.

## Future Enhancements
- Authentication for config changes
- Role-based access & API keys
- Additional data providers / failover
- Advanced charting & alert rules (percent bands, trailing stops)
- Coverage reporting & CI pipeline

## License
MIT (add LICENSE if needed)
