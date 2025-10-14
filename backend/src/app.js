import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import router from './routes/index.js';
import { errorHandler } from './middleware/error.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { fileURLToPath } from 'url';
import { createLogger } from "./config/logger.js";
import { requestIdMiddleware } from './middleware/requestId.middleware.js';
import { getRequestId } from './config/logger.js';
const Logger = createLogger(import.meta.url);

export function createApp() {
  const app = express();

  const stream = {
    write: (message) => Logger.http(message.trim()),
  };

  // Register custom token for requestId used by correlation middleware
  morgan.token('rid', () => getRequestId() || '-');

  const morganMiddleware = morgan(
    ':method :url :status :res[content-length] - :response-time ms rid=:rid',
    { stream },
  );

  // Correlation ID middleware FIRST so downstream logs can include it
  app.use(requestIdMiddleware);

  app.use(morganMiddleware);
  app.use(helmet());
  // Support raw text (CSV) uploads for batch import BEFORE json parser
  app.use(express.text({ type: 'text/plain', limit: '256kb' }));
  app.use(express.json({ limit: '1mb' }));
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
  }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
  // Swagger UI (read once, cache in memory) with resilient path resolution
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
      path.join(__dirname, '..', 'openapi.yaml'),               // backend/src -> backend/openapi.yaml
      path.join(process.cwd(), 'backend', 'openapi.yaml'),       // monorepo root run
      path.join(process.cwd(), 'openapi.yaml'),                  // if started inside backend already
    ];
    let specPath;
    for (const c of candidates) {
      if (fs.existsSync(c)) { specPath = c; break; }
    }
    if (specPath) {
      const raw = fs.readFileSync(specPath, 'utf8');
      const doc = YAML.parse(raw);
      app.use('/docs', swaggerUi.serve, swaggerUi.setup(doc, { explorer: true }));
      app.get('/docs.json', (req, res) => res.json(doc));
      Logger.info(`Swagger UI mounted at /docs (spec: ${specPath})`);
    } else {
      Logger.warn(`Swagger spec not found in candidates: ${candidates.join(', ')}`);
    }
  } catch (e) {
    Logger.error('Swagger setup failed:', e);
  }
  app.use('/api', router);
  app.use(errorHandler);
  return app;
}

export default createApp;