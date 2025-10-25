# GitHub Copilot Instructions

This workspace contains multiple full-stack and AI projects. The primary applications are `daily-tracker-7Oct` and `rapid-astrology-21Sep`.

## General Architecture

Both `daily-tracker-7Oct` and `rapid-astrology-21Sep` are monorepos with a similar structure:
- A `backend` directory containing a Node.js/Express application.
- A `frontend` directory containing a React/Vite application.
- A `docker-compose.yml` file for containerized setup.

The third project, `Building-an-Agentic-AI-System-with-Agent2Agent-A2A-and-MCP-Tools-on-SAP-BTP`, is a Python-based agentic system using SAP AI Core.

---

## Project: `daily-tracker-7Oct`

This application tracks financial assets, fetches quotes, and sends alerts.

### Key Concepts
- **Backend**: Node.js (ESM), Express, Mongoose.
- **Frontend**: React, TypeScript, Vite, TailwindCSS, Recharts.
- **Database**: MongoDB.
- **Real-time Updates**: Server-Sent Events (SSE) are used to push alert notifications to the frontend. See `alert.controller.js`.
- **Scheduled Jobs**: A `node-cron` job runs every 30 minutes to fetch the latest quotes. See `fetch.service.js`.
- **API Type Safety**: The frontend uses `openapi-typescript` to generate TypeScript types from the backend's `openapi.yaml`. To update types, run `npm run api:gen` in the `frontend` directory.

### Development Workflow

**Running Locally (Docker Recommended):**
```bash
# Build and start all services
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

**Running Manually:**
1.  **Backend**:
    ```bash
    cd daily-tracker-7Oct/backend
    npm install
    npm run seed # Optional: seed database with initial assets
    npm run dev
    ```
2.  **Frontend**:
    ```bash
    cd daily-tracker-7Oct/frontend
    npm install
    npm run dev
    ```

### Testing
- Backend tests use Jest with `mongodb-memory-server` for in-memory database testing.
- Run backend tests with `npm test` in the `daily-tracker-7Oct/backend` directory. The configuration is in `jest.config.mjs`.

---

## Project: `rapid-astrology-21Sep`

A full-stack application for numerology and astrology placeholders, featuring OTP authentication and payment integration.

### Key Concepts
- **Backend**: Node.js, Express, Mongoose.
- **Frontend**: React, Vite, JavaScript.
- **Services**: Redis for caching, PayU for payments, Google OAuth.
- **API Contract**: The backend uses a standardized JSON success envelope for all responses. This is enforced by contract tests.
    ```json
    {
      "success": true,
      "message": "semantic_code",
      "requestId": "<uuid>",
      "data": { /* payload */ }
    }
    ```
    - The `data` property contains the response payload.
    - This is tested in `backend/tests/envelope.shape.test.js`.
- **Authentication**: JWT-based authentication with a phone-based OTP flow and Google OAuth. The OTP logic is configurable in `backend/src/config/otp.config.js`.
- **API Versioning**: Endpoints are versioned under `/api/v1`.

### Development Workflow

**Running Locally (Docker Recommended):**
```bash
docker compose up --build
```

**Running Manually:**
1.  **Backend**:
    ```bash
    cd rapid-astrology-21Sep/backend
    npm install
    npm run dev
    ```
2.  **Frontend**:
    ```bash
    cd rapid-astrology-21Sep/frontend
    npm install
    npm run dev
    ```

### Caching
- Numerology results are cached in Redis to reduce redundant calculations.
- Cache keys follow patterns like `nn:*` for name numbers and `dm:*` for destiny matches.
- The cache TTL is configurable via the `CACHE_TTL_SECONDS` environment variable.

### Testing
- Backend tests use an in-memory MongoDB.
- Run tests with `npm test` in the `rapid-astrology-21Sep/backend` directory.

---

## Project: `Building-an-Agentic-AI-System`

This is a Python project demonstrating an agentic AI system with tool-calling capabilities, integrated with SAP AI Core.

- **Main Logic**: `agentic-ai/main.py` contains the `AgentExecutor` class which orchestrates the interaction between the LLM and the defined tools.
- **Tools**: Custom tools are defined in `agentic-ai/tools.py`.
- **Configuration**: SAP AI Core credentials and endpoints need to be configured as environment variables, as shown in `agentic-ai/main.py`.
