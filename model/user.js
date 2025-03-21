// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Allow null for social login only users
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    select: false // Don't return password by default
  },
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true // Allow null for non-phone auth users
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  facebookId: {
    type: String,
    unique: true,
    sparse: true
  },
  appleId: {
    type: String,
    unique: true,
    sparse: true
  },
  profilePicture: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to hash password
UserSchema.pre('save', async function(next) {
  const user = this;
  
  // Only hash the password if it's modified (or new)
  if (!user.isModified('password')) return next();
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash password
    const hashedPassword = await bcrypt.hash(user.password, salt);
    
    // Replace plain text password with hashed password
    user.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    const user = await this.model('User').findById(this._id).select('+password');
    return await bcrypt.compare(candidatePassword, user.password);
  } catch (error) {
    throw error;
  }
};

// Create the model
const User = mongoose.model('User', UserSchema);

module.exports = User;