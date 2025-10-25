import rateLimit from 'express-rate-limit';
import MongoStore from 'rate-limit-mongo';
import RateLimit from '../models/RateLimit.js';
import Logger from '../config/logger.js';

// In-memory cache for rate limit configurations to reduce DB queries
const limitCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getMongoUrl = () => {
  if (!process.env.MONGO_URI) {
    Logger.error('MONGO_URI environment variable is not set.');
    throw new Error('MONGO_URI is not defined');
  }
  return process.env.MONGO_URI;
};

// Key generator: Use user ID if authenticated, otherwise fall back to IP address.
const keyGenerator = (req) => {
  if (req.user && req.user.id) {
    return req.user.id;
  }
  // 'x-forwarded-for' header is important for apps behind a proxy (like Nginx, Heroku)
  return req.headers['x-forwarded-for'] || req.ip;
};

// Fetches rate limit settings from DB or cache
const getRateLimitConfig = async (endpoint) => {
  if (limitCache.has(endpoint)) {
    return limitCache.get(endpoint);
  }

  let config = await RateLimit.findOne({ endpoint }).lean();

  if (!config) {
    // If no specific config, use a default and store it in the DB for future customization
    config = await RateLimit.findOneAndUpdate(
      { endpoint },
      { endpoint, perMinute: 60, perHour: 1000, perDay: 5000 },
      { upsert: true, new: true, runValidators: true }
    ).lean();
    Logger.info(`No rate limit config found for ${endpoint}. Created with default values.`);
  }

  limitCache.set(endpoint, config);
  // Invalidate cache entry after TTL
  setTimeout(() => limitCache.delete(endpoint), CACHE_TTL);

  return config;
};

const createLimiter = (windowMs, max, suffix) => {
  return rateLimit({
    store: new MongoStore({
      uri: getMongoUrl(),
      collectionName: `rate_limits_${suffix}`,
      expireTimeMs: windowMs,
      errorHandler: (err) => Logger.error(`Rate limit store error (${suffix}):`, err),
    }),
    windowMs,
    max,
    keyGenerator,
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json({
        success: false,
        message: `Too many requests, please try again after ${Math.ceil(options.windowMs / 60000)} minutes.`,
      });
    },
  });
};

export const dynamicRateLimiter = async (req, res, next) => {
  try {
    // Use req.route.path to get the route pattern (e.g., '/assets/:id') instead of the full URL
    const endpoint = req.route.path;
    if (!endpoint) {
      return next(); // Not a matched route, skip
    }

    const config = await getRateLimitConfig(endpoint);

    const minuteLimiter = createLimiter(1 * 60 * 1000, config.perMinute, 'minute');
    const hourLimiter = createLimiter(60 * 60 * 1000, config.perHour, 'hour');
    const dayLimiter = createLimiter(24 * 60 * 60 * 1000, config.perDay, 'day');

    // Chain the limiters. If one fails, the request is terminated.
    minuteLimiter(req, res, (err) => {
      if (err) return next(err);
      hourLimiter(req, res, (err) => {
        if (err) return next(err);
        dayLimiter(req, res, next);
      });
    });
  } catch (error) {
    Logger.error('Error in dynamic rate limiter:', error);
    next(error);
  }
};
