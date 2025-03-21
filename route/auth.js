// routes/auth.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../model/user');
const { isAuthenticated } = require('../middleware/auth');
const { sendOtp, verifyOtp } = require('../services/phoneAuth');

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

// Get current user
router.get('/user', isAuthenticated, (req, res) => {
  res.json({ user: createSanitizedUser(req.user) });
});

// Email/Password Signup
// In signup route
router.post('/signup', async (req, res) => {
  try {
    console.log("Signup request received:", req.body);
    
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
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
    
    console.log("Trying to save user");
    await user.save();
    console.log("User saved successfully");
    
    // Log user in
    req.login(user, (err) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: 'Session error', error: err.toString() });
      }
      console.log("User logged in successfully");
      return res.status(201).json({ user: createSanitizedUser(user) });
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
    
    // Log user in
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Session error', error: err });
      }
      return res.json({ user: createSanitizedUser(user) });
    });
  })(req, res, next);
});

// Google Auth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google Auth Callback
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  }
);

// Facebook Auth
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

// Facebook Auth Callback
router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  }
);

// Apple Auth
router.get('/apple', passport.authenticate('apple'));

// Apple Auth Callback
router.post('/apple/callback',
  passport.authenticate('apple', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  }
);

// Phone Auth - Request OTP
router.post('/phone/request-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    
    // Send OTP via Twilio or other SMS service
    const result = await sendOtp(phoneNumber);
    
    res.json({ 
      message: 'OTP sent successfully',
      verificationId: result.verificationId 
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
});

// Phone Auth - Verify OTP
router.post('/phone/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp, verificationId } = req.body;
    
    if (!phoneNumber || !otp || !verificationId) {
      return res.status(400).json({ message: 'Phone number, OTP, and verification ID are required' });
    }
    
    // Verify OTP
    const isValid = await verifyOtp(phoneNumber, otp, verificationId);
    
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid OTP' });
    }
    
    // Check if user already exists
    let user = await User.findOne({ phoneNumber });
    
    // If not, create new user
    if (!user) {
      user = new User({
        phoneNumber,
        name: `User-${phoneNumber.slice(-4)}` // Default name based on last 4 digits
      });
      
      await user.save();
    }
    
    // Log user in
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Session error', error: err });
      }
      return res.json({ user: createSanitizedUser(user) });
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify OTP', error: error.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout error', error: err });
    }
    req.session.destroy();
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

module.exports = router;