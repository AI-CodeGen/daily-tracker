import { runWithRequestContext } from '../config/logger.js';

// Wrapper to fit standard express middleware signature
export function requestIdMiddleware(req, res, next) {
  runWithRequestContext(req, res, next);
}

export default requestIdMiddleware;
