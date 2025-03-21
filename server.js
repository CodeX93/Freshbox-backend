require('dotenv').config(); // this should be at the very top
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Import passport configuration - ADD THIS LINE
require('./config/passport');

const app = express();

// Import auth routes
const authRoutes = require('./route/auth');

// Middleware
app.use(express.json());
app.use(cookieParser());
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
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/authapp';

const mongooseOptions = {
  // useNewUrlParser: true,
  // useUnifiedTopology: true,
  ssl: true, // ensures SSL connection (important for Atlas or remote MongoDB)
};
// Connect to MongoDB
mongoose.connect(mongoURI, mongooseOptions)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));


// Routes
app.use('/api/auth', authRoutes);

// Start server
const PORT = process.env.PORT || 5023;
console.log(PORT)
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});