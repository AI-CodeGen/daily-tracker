import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { createLogger } from '../config/logger.js';

const Logger = createLogger(import.meta.url);

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.session?.token;
    
    if (!token) {
      Logger.warn('requireAuth - No authentication token provided');
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-googleId');
    
    if (!user || !user.isActive) {
      Logger.warn('requireAuth - Invalid or inactive user attempted to authenticate');
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    req.user = user;
    Logger.info(`requireAuth - User ${user.email} authenticated successfully`);
    next();
  } catch (error) {
    Logger.error('requireAuth - Authentication error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.session?.token;
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-googleId');
      
      if (user && user.isActive) {
        req.user = user;
      }
    } else {
      Logger.warn('optionalAuth - No authentication token provided');
    }
    next();
  } catch (error) {
    // Silent fail for optional auth
    Logger.error('optionalAuth - Authentication error:', error);
    next();
  }
};

export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
};