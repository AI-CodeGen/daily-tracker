import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

// ---- Request context (moved from requestContext.js) ----
const als = new AsyncLocalStorage();

export function runWithRequestContext(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const requestId = typeof incoming === 'string' && incoming.trim() !== '' ? incoming.trim() : randomUUID();
  const store = { requestId, startHrTime: process.hrtime.bigint() };
  als.run(store, () => {
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });
}

export function getRequestContext() { return als.getStore(); }
export function getRequestId() { return als.getStore()?.requestId; }

// ---- Level definitions ----
const levels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const level = () => (process.env.NODE_ENV === "production" ? "warn" : "debug");

// ---- Colors (console only) ----
const colors = { error: "red", warn: "yellow", info: "green", http: "magenta", debug: "white" };
winston.addColors(colors);

// ---- Formatting helpers ----
// Inject a fallback label ONLY if one is not already present (so child loggers win)
const ensureLabel = winston.format((info) => {
  if (!info.label) info.label = "main";
  return info;
});

const attachRequestId = winston.format((info) => {
  const rid = getRequestId();
  if (rid) info.requestId = rid;
  return info;
});

// Filter for http level only
const httpFilter = winston.format((info) => {
  return info.level === 'http' ? info : false;
});

// The new base format for all transports, outputting structured JSON.
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  attachRequestId(),
  ensureLabel(),
  winston.format.json()
);

// The old format for human-readable console output. Kept for reference.
/*
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  attachRequestId(),
  ensureLabel(),
  winston.format.printf((info) => {
    const ridPart = info.requestId ? ` (rid=${info.requestId})` : '';
    return `${info.timestamp} [${info.label}]${ridPart} ${info.level}: ${info.message}`;
  })
);
*/

// Parent logger (no hard-coded label; fallback handled by ensureLabel())
const parentLogger = winston.createLogger({
  levels,
  level: level(),
  format: jsonFormat, // Use JSON format for all transports by default
  transports: [
    new winston.transports.Console({
      // To switch back to colorized console logs for local dev,
      // comment out the line below and uncomment the 'consoleFormat' block above.
      // format: consoleFormat,
    }),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/all.log" }),
    new winston.transports.File({
      filename: "logs/http.log",
      level: "http",
      format: winston.format.combine(httpFilter(), jsonFormat),
    }),
  ],
});

// Factory to create a child logger for a given module (import.meta.url)
export function createLogger(fileUrl) {
  try {
    const filename = fileUrl ? path.basename(fileURLToPath(fileUrl)) : "main";
    return parentLogger.child({ label: filename });
  } catch (e) {
    parentLogger.warn(`logger createLogger fallback: ${e.message}`);
    return parentLogger; // Fallback if fileURLToPath fails
  }
}

export default parentLogger;
