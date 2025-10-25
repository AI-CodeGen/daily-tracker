import jwt from 'jsonwebtoken';
import { createLogger } from '../config/logger.js';

const Logger = createLogger(import.meta.url);

export const googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed`);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: req.user._id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Store token in session
    req.session.token = token;
    req.session.user = {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture
    };

    Logger.info(`User ${req.user.email} logged in successfully`);
    
    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?auth=success`);
  } catch (error) {
    Logger.error('Auth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed`);
  }
};

export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      Logger.error('Logout error:', err);
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
};

export const getUser = (req, res) => {
  if (req.user) {
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture
      }
    });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
};