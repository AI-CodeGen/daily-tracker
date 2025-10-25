import dotenv from 'dotenv';
dotenv.config();
import rateLimit from 'express-rate-limit';
import MongoStore from 'rate-limit-mongo';
import RateLimit from '../models/RateLimit.js';
import Logger from '../config/logger.js';

// In-memory cache for rate limit configurations to reduce DB queries
const limitCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

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
  const now = Date.now();
  const cached = limitCache.get(endpoint);

  if (cached && now < cached.expiry) {
    return cached.data;
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

  limitCache.set(endpoint, { data: config, expiry: now + CACHE_TTL });

  // Ensure the cache entry is deleted after the TTL to prevent memory leaks
  setTimeout(() => {
    limitCache.delete(endpoint);
    Logger.debug(`Cache expired and deleted for endpoint: ${endpoint}`);
  }, CACHE_TTL);

  return config;
};

const createLimiter = (windowMs, limitFn, collectionSuffix) => {
  return rateLimit({
    store: new MongoStore({
      uri: getMongoUrl(),
      collectionName: `rate_limits_${collectionSuffix}`,
      expireTimeMs: windowMs,
      errorHandler: (err) => Logger.error(`Rate limit store error (${collectionSuffix}):`, err),
    }),
    windowMs,
    // The `limit` property is a function that dynamically resolves the limit.
    limit: async (req) => {
      try {
        const endpoint = req.route.path;
        const config = await getRateLimitConfig(endpoint);
        return limitFn(config);
      } catch (error) {
        Logger.error('Failed to resolve rate limit:', { error });
        // Fallback to a safe default if config lookup fails
        return 60;
      }
    },
    keyGenerator,
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json({
        success: false,
        message: `Too many requests for this time window. Please try again later.`,
        limit: options.limit,
        window: `${options.windowMs / 1000}s`,
      });
    },
  });
};

const minuteLimiter = createLimiter(1 * 60 * 1000, (config) => config.perMinute, 'minute');
const hourLimiter = createLimiter(60 * 60 * 1000, (config) => config.perHour, 'hour');
const dayLimiter = createLimiter(24 * 60 * 60 * 1000, (config) => config.perDay, 'day');

export const rateLimiters = [minuteLimiter, hourLimiter, dayLimiter];
