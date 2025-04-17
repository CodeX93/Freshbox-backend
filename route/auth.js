// routes/auth.js - Updated with JWT token support and proper redirect handling
const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../model/user');
const { isAuthenticated } = require('../middleware/auth');
const { sendOtp, verifyOtp, otpStore } = require('../services/phoneAuth');
const crypto = require('crypto');

// JWT Secret for token signing (should be in .env file)
const JWT_SECRET = process.env.JWT_SECRET || 'yourSecretKeyForJWT';

// Helper function to create sanitized user object (no sensitive info)
const createSanitizedUser = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    profilePicture: user.profilePicture
  };
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id.toString() },
    JWT_SECRET,
    { expiresIn: '7d' } // Token expires in 7 days
  );
};

// Frontend URLs
const FRONTEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://yourdomain.com' 
  : 'http://localhost:3000';
  
const FRONTEND_SUCCESS_URL = `${FRONTEND_URL}/auth/success`;
const FRONTEND_FAILURE_URL = `${FRONTEND_URL}/auth/login?error=true`;

// Get current user
router.get('/user', isAuthenticated, (req, res) => {
  res.json({ user: createSanitizedUser(req.user) });
});

// Email/Password Signup
router.post('/signup', async (req, res) => {
  try {
    console.log("Signup request received:", req.body);
    
    const { name, email, password, username, phoneNumber } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    const user = new User({
      name,
      email,
      password
    });
    
    // Add optional fields if provided
    if (username) user.username = username;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    
    console.log("Trying to save user");
    await user.save();
    console.log("User saved successfully");
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Set token cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Log user in with passport
    req.login(user, (err) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: 'Session error', error: err.toString() });
      }
      console.log("User logged in successfully");
      
      // Return user data and token
      return res.status(201).json({ 
        user: createSanitizedUser(user),
        token: token
      });
    });
  } catch (error) {
    console.error("Server error in signup:", error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

// Email/Password Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: 'Authentication error', error: err });
    }
    
    if (!user) {
      return res.status(401).json({ message: info.message });
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Set token cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Log user in
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Session error', error: err });
      }
      
      // Return user data and token
      return res.json({ 
        user: createSanitizedUser(user),
        token: token
      });
    });
  })(req, res, next);
});

// Phone Auth - Send OTP - Added to match frontend
router.post('/phone/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    
    // Standardize phone number format
    const standardizedPhoneNumber = phoneNumber.replace(/[\s-()]/g, '');
    
    // Generate verification ID
    const verificationId = crypto.randomBytes(16).toString('hex');
    
    // Send OTP
    await sendOtp(standardizedPhoneNumber, verificationId);
    
    // Return verification ID
    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      verificationId
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
});

// Phone Auth - Verify OTP (Modified to support skipLogin flag)
router.post('/phone/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp, verificationId, name, skipLogin } = req.body;
    
    if (!phoneNumber || !otp || !verificationId) {
      return res.status(400).json({ message: 'Phone number, OTP, and verification ID are required' });
    }
    
    // Standardize phone number format
    const standardizedPhoneNumber = phoneNumber.replace(/[\s-()]/g, '');
    console.log("Standardized phone number:", standardizedPhoneNumber);
    
    // Verify OTP
    const isValid = await verifyOtp(phoneNumber, otp, verificationId);
    
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid OTP' });
    }
    
    // If skipLogin is true, just return success without creating user or logging in
    if (skipLogin) {
      console.log("OTP verified successfully. Skipping login as requested.");
      return res.json({ 
        success: true, 
        message: 'OTP verified successfully',
        verifiedPhone: standardizedPhoneNumber
      });
    }
    
    // Regular flow - find or create user and login
    console.log("Searching for user with phone number:", standardizedPhoneNumber);
    let user = await User.findOne({ phoneNumber: standardizedPhoneNumber });
    console.log("User search result:", user ? `Found user: ${user._id}` : "No user found");
    
    if (!user) {
      // If user doesn't exist, create a new one with the provided name
      // If name is not provided, use a default name pattern
      const userName = name && name.trim() ? name.trim() : `User-${standardizedPhoneNumber.slice(-4)}`;
      
      console.log("Creating new user with phone number:", standardizedPhoneNumber, "and name:", userName);
      user = new User({
        phoneNumber: standardizedPhoneNumber,
        name: userName
      });
      
      await user.save();
      console.log("New user created with ID:", user._id);
    } else if (name && name.trim()) {
      // If user exists and name is provided, update the name
      console.log("Updating existing user name to:", name);
      user.name = name.trim();
      await user.save();
      console.log("User name updated");
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Set token cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Log user in
    req.login(user, (err) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: 'Session error', error: err.toString() });
      }
      console.log("User logged in successfully with ID:", user._id);
      
      // Return user data and token
      return res.json({ 
        user: createSanitizedUser(user),
        token: token
      });
    });
  } catch (error) {
    console.error("Error in verify-otp:", error);
    res.status(500).json({ message: 'Failed to verify OTP', error: error.message });
  }
});

// Phone Auth - Complete Registration with Name
router.post('/phone/complete-registration', async (req, res) => {
  try {
    const { phoneNumber, name } = req.body;
    
    if (!phoneNumber || !name || !name.trim()) {
      return res.status(400).json({ message: 'Phone number and name are required' });
    }
    
    // Standardize phone number
    const standardizedPhoneNumber = phoneNumber.replace(/[\s-()]/g, '');
    console.log("Completing registration for phone:", standardizedPhoneNumber, "with name:", name);
    
    // Find or create user with the name
    let user = await User.findOne({ phoneNumber: standardizedPhoneNumber });
    
    if (!user) {
      // Create new user with provided name
      console.log("No existing user found. Creating new user with name:", name);
      user = new User({
        phoneNumber: standardizedPhoneNumber,
        name: name.trim()
      });
    } else {
      // Update existing user's name
      console.log("Existing user found. Updating name to:", name);
      user.name = name.trim();
    }
    
    await user.save();
    console.log(`User ${user._id} saved with name: ${name}`);
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Set token cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Log user in
    req.login(user, (err) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: 'Session error', error: err.toString() });
      }
      console.log("User logged in successfully with ID:", user._id);
      
      // Return user data and token
      return res.json({ 
        user: createSanitizedUser(user),
        token: token,
        message: 'Registration completed successfully'
      });
    });
  } catch (error) {
    console.error("Error in complete-registration:", error);
    res.status(500).json({ 
      message: 'Failed to complete registration', 
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  // Clear token cookie
  res.clearCookie('token');
  
  // Clear session
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout error', error: err });
    }
    req.session.destroy();
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Google Auth
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: true
}));

// Google Auth Callback
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: FRONTEND_FAILURE_URL,
    session: true
  }),
  (req, res) => {
    // Generate JWT token
    const token = generateToken(req.user);
    
    // Set token cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Redirect to frontend with success
    res.redirect(FRONTEND_SUCCESS_URL);
  }
);

// Facebook Auth
router.get('/facebook', passport.authenticate('facebook', { 
  scope: ['email'],
  session: true
}));

// Facebook Auth Callback
router.get('/facebook/callback',
  passport.authenticate('facebook', { 
    failureRedirect: FRONTEND_FAILURE_URL,
    session: true
  }),
  (req, res) => {
    // Generate JWT token
    const token = generateToken(req.user);
    
    // Set token cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Redirect to frontend with success
    res.redirect(FRONTEND_SUCCESS_URL);
  }
);

// Apple Auth
router.get('/apple', passport.authenticate('apple', { session: true }));

// Apple Auth Callback
router.post('/apple/callback',
  passport.authenticate('apple', { 
    failureRedirect: FRONTEND_FAILURE_URL,
    session: true
  }),
  (req, res) => {
    // Generate JWT token
    const token = generateToken(req.user);
    
    // Set token cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Redirect to frontend with success
    res.redirect(FRONTEND_SUCCESS_URL);
  }
);

module.exports = router;