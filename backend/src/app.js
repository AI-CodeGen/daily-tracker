import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import session from 'express-session';
import router from './routes/index.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.routes.js';
import { errorHandler } from './middleware/error.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { fileURLToPath } from 'url';
import { createLogger } from "./config/logger.js";
import { requestIdMiddleware } from './middleware/requestId.middleware.js';
import { getRequestId } from './config/logger.js';
import passport from './config/passport.js';
const Logger = createLogger(import.meta.url);

export function createApp() {
  const app = express();

  const stream = {
    write: (message) => Logger.http(message.trim()),
  };

  // Register custom token for requestId used by correlation middleware
  morgan.token('rid', () => getRequestId() || '-');
  // Register custom token for IP address
  morgan.token('ip', (req) => req.ip);

  const morganMiddleware = morgan(
    ':ip - :method :url :status :res[content-length] - :response-time ms rid=:rid',
    { stream },
  );

  // Correlation ID middleware FIRST so downstream logs can include it
  app.use(requestIdMiddleware);

  app.use(morganMiddleware);
  app.use(helmet());
  
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  }));

  // Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // Support raw text (CSV) uploads for batch import BEFORE json parser
  app.use(express.text({ type: 'text/plain', limit: '256kb' }));
  app.use(express.json({ limit: '1mb' }));
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true
  }));
  
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
  
  // Mount auth routes directly (not under /api) for OAuth callbacks
  app.use('/auth', authRoutes);
  
  // Mount other API routes under /api
  app.use('/api', router);
  app.use('/api/admin', adminRoutes);

  app.use(errorHandler);
  return app;
}

export default createApp;