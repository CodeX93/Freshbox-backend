require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
require('./config/passport');

// Import routes

const serviceAreaRoutes=require('./route/serviceArea.routes')
const userRoutes = require('./route/auth.routes');
const serviceRouter = require('./route/service.routes');
const orderRouter = require('./route/order.routes');
const paymentRoutes = require('./route/payment.routes');
const riderRoutes = require('./route/rider.routes');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// Configure CORS with credentials support
const allowedOrigins = [
  "http://localhost:3001",
  "http://localhost:3000",
  "https://freshbox-frontend.netlify.app"
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

// Configure session
app.use(session({
  secret: process.env.SESSION_SECRET ,
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
const mongoURI = process.env.MONGODB_URI ;
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));



// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Start server
const PORT = process.env.PORT;
console.log(`Starting server on port ${PORT}`);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// Routes 
app.get('/', (req, res) => {
  res.send('Welcome to the API');
});
app.use('/api/auth', userRoutes);
app.use('/api/service', serviceRouter);
app.use('/api/serviceArea', serviceAreaRoutes);
app.use("/api/orders", orderRouter);
app.use("/api/payment", paymentRoutes);
app.use("/api/rider", riderRoutes);