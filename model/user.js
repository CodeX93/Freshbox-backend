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
  cardNumber:{
    type: String,
    required: true
  },
  nameOnCard:{
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
    
  },
  email: {
    type: String,
    unique: true,
    sparse: true, 
    lowercase: true,
    trim: true,
    required: true
  },
  password: {
    type: String,
    select: false,
    required: true
  },
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true
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
  },
  otp:{
    type: String,
  },
  emailVerified:{
    type: Boolean,
    default:false,
  },
  otpExpiry:{
    type: Date,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  username:{
    type:String
  }
},{timestamps:true});

UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password =await bcrypt.hash(this.password, 10);
    next();
  } else {
    return next();
  }
});

UserSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', UserSchema);
module.exports = User;