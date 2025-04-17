// middleware/auth.js - Updated with JWT support
const jwt = require('jsonwebtoken');
const User = require('../model/user');

// JWT Secret (should match the one in auth.js)
const JWT_SECRET = process.env.JWT_SECRET || 'yourSecretKeyForJWT';

const isAuthenticated = async (req, res, next) => {
  console.log('[Auth Middleware] Checking authentication...');
  
  // First check if user is authenticated with Passport session
  if (req.isAuthenticated && req.isAuthenticated()) {
    console.log('[Auth Middleware] User authenticated via Passport session:', req.user.id);
    return next();
  }
  
  // If not authenticated via session, check for JWT token
  try {
    // Get token from cookie, header, or query parameter
    let token = null;
    
    // Check cookie first
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('[Auth Middleware] Found token in cookies');
    }
    
    // Then check Authorization header
    if (!token && req.headers.authorization) {
      // Check for Bearer token format
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7, authHeader.length);
        console.log('[Auth Middleware] Found token in Authorization header');
      }
    }
    
    // Finally check the x-auth-token header
    if (!token && req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
      console.log('[Auth Middleware] Found token in x-auth-token header');
    }
    
    // If no token found, user is not authenticated
    if (!token) {
      console.log('[Auth Middleware] No authentication token found');
      return res.status(401).json({ message: 'Unauthorized - Please log in to access this resource' });
    }
    
    // Verify token
    console.log('[Auth Middleware] Verifying token...');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[Auth Middleware] Token verified, decoded:', decoded);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      console.log('[Auth Middleware] User not found in database');
      return res.status(401).json({ message: 'Unauthorized - User not found' });
    }
    
    // Add user to request object
    req.user = user;
    console.log('[Auth Middleware] User authenticated via JWT token:', user._id);
    next();
  } catch (error) {
    console.error('[Auth Middleware] Authentication error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Unauthorized - Token expired' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Unauthorized - Invalid token' });
    }
    
    return res.status(401).json({ message: 'Unauthorized - Authentication failed' });
  }
};

module.exports = { isAuthenticated };