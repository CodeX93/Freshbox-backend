// server.js
require('dotenv').config(); // this should be at the very top
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// Import passport configuration
require('./config/passport');

// Import routes
const authRoutes = require('./route/auth');
const userProfileRoutes = require('./route/userProfileRoutes');
const serviceAreaRoutes=require('./route/serviceAreaRoutes')
const serviceRoutes=require('./route/serviceRoutes')

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// Configure CORS with credentials support
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Configure session
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/authapp'
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    secure: false, // Set to false for local development
    httpOnly: true,
    sameSite: 'lax' // Add this for cross-site cookie handling
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads/profile-pictures');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug middleware to log API requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/authapp';
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes - Important: The route path /api/users matches your frontend API calls
app.use('/api/auth', authRoutes);
app.use('/api/users', userProfileRoutes); // This matches your frontend API calls
app.use('/api/service', serviceRoutes.router);
app.use('/api/serviceArea', serviceAreaRoutes.router);




// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Start server
const PORT = process.env.PORT || 5023;
console.log(`Starting server on port ${PORT}`);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});