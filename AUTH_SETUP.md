# Authentication Setup Guide

## Google OAuth Configuration Required

To enable Google OAuth login, you need to set up the following environment variables in your `.env` file:

### Required Environment Variables:

```bash
# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# Session & JWT Security
SESSION_SECRET=your-session-secret-here
JWT_SECRET=your-jwt-secret-here

# Frontend URL for redirects
FRONTEND_URL=http://localhost:5173
```

### Google Cloud Console Setup:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "APIs & Services" > "Credentials"
5. Create OAuth 2.0 Client ID
6. Set **Authorized redirect URIs** to: `http://localhost:4000/api/auth/google/callback`
7. Copy the Client ID and Client Secret to your `.env` file

### Testing:

Once configured, restart the backend and the Google login should work properly.

### Current Issue:

The blank screen occurs because either:
1. Google OAuth credentials are missing/incorrect
2. The callback URL in Google Console doesn't match `http://localhost:4000/api/auth/google/callback`
3. Environment variables are not loaded properly