import RateLimit from '../models/RateLimit.js';
import { asyncHandler } from '../middleware/errorHandlers.js';
import Logger from '../config/logger.js';

// @desc    Get rate limit settings for a specific endpoint
// @route   GET /api/admin/rate-limits/:endpoint
// @access  Private/Admin
export const getRateLimit = asyncHandler(async (req, res) => {
  const { endpoint } = req.params;
  const rateLimit = await RateLimit.findOne({ endpoint: decodeURIComponent(endpoint) });

  if (!rateLimit) {
    res.status(404);
    throw new Error('Rate limit configuration not found for this endpoint');
  }

  res.status(200).json({
    success: true,
    message: 'rate_limit_fetched',
    data: rateLimit,
  });
});

// @desc    Create or update rate limit settings for an endpoint
// @route   PUT /api/admin/rate-limits/:endpoint
// @access  Private/Admin
export const upsertRateLimit = asyncHandler(async (req, res) => {
  const { endpoint } = req.params;
  const { perMinute, perHour, perDay } = req.body;

  const decodedEndpoint = decodeURIComponent(endpoint);

  const rateLimit = await RateLimit.findOneAndUpdate(
    { endpoint: decodedEndpoint },
    { perMinute, perHour, perDay, endpoint: decodedEndpoint },
    { new: true, upsert: true, runValidators: true }
  );

  Logger.info(`Rate limit for endpoint ${decodedEndpoint} updated`, {
    adminId: req.user.id,
    newLimits: rateLimit,
  });

  res.status(200).json({
    success: true,
    message: 'rate_limit_updated',
    data: rateLimit,
  });
});
