const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Payment method schema
const PaymentMethodSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  last4: {
    type: String,
    required: true
  },
  expiry: {
    type: String,
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
});

// Preferences schema
const PreferencesSchema = new mongoose.Schema({
  detergent: {
    type: String,
    enum: ['regular', 'sensitive', 'eco'],
    default: 'regular'
  },
  temperature: {
    type: String,
    enum: ['cold', 'warm', 'hot'],
    default: 'warm'
  },
  folding: {
    type: String,
    enum: ['standard', 'hanging', 'special'],
    default: 'standard'
  },
  notifications: {
    type: Boolean,
    default: true
  },
  emailUpdates: {
    type: Boolean,
    default: true
  }
});

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
  address: {
    type: String,
    default: ''
  },
  preferences: {
    type: PreferencesSchema,
    default: () => ({})
  },
  paymentMethods: {
    type: [PaymentMethodSchema],
    default: []
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