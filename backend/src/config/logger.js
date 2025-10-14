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

const baseFormat = winston.format.printf((info) => {
  const ridPart = info.requestId ? ` (rid=${info.requestId})` : '';
  return `${info.timestamp} [${info.label}]${ridPart} ${info.level}: ${info.message}`;
});

// Parent logger (no hard-coded label; fallback handled by ensureLabel())
const parentLogger = winston.createLogger({
  levels,
  level: level(),
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
    attachRequestId(),
    ensureLabel(),
    baseFormat
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
        attachRequestId(),
        ensureLabel(),
        baseFormat
      ),
    }),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/all.log" }),
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
