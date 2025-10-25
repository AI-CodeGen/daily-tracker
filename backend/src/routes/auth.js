import express from 'express';
import passport from '../config/passport.js';
import { googleCallback } from '../controllers/auth.controller.js';

const router = express.Router();

// Google OAuth login
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

// Google OAuth callback
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed` }),
  googleCallback
);

export default router;