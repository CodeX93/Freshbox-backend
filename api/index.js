const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
require('../config/passport');

// Import routes
const serviceAreaRoutes = require('../route/serviceArea.routes');
const userRoutes = require('../route/auth.routes');
const serviceRouter = require('../route/service.routes');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS
const allowedOrigins = [
  "http://localhost:3001",
  "http://localhost:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    secure: false,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Create uploads dir if not exists (you can't write in Vercel, but keeping this for local)
const uploadsDir = path.join(__dirname, '../uploads/profile-pictures');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Static file serving - won't work well on Vercel (read-only FS)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Debug logs
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// MongoDB connect (singleton connection to avoid duplication on cold starts)
let isConnected = false;
async function connectToMongo() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
  console.log('✅ Connected to MongoDB');
}

connectToMongo().catch(console.error);

// Routes
app.use('/api/auth', userRoutes);
app.use('/api/service', serviceRouter);
app.use('/api/serviceArea', serviceAreaRoutes);

// Error middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Export as Vercel serverless function
module.exports = { handler: serverless(app) };
