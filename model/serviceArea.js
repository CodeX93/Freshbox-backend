const mongoose = require('mongoose');

const ServiceAreaSchema = new mongoose.Schema({
  zipCode: {
    type: String,
    required: [true, 'Zip code is required'],
    trim: true,
    unique: true,
    match: [/^\d{5}$/, 'Zip code must be 5 digits']
  },
  name: {
    type: String,
    required: [true, 'Area name is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  serviceDays: {
    type: [String],
    required: [true, 'Service days are required'],
    validate: {
      validator: function(days) {
        const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return days.length > 0 && days.every(day => validDays.includes(day));
      },
      message: 'Must include at least one valid service day'
    }
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  minOrderValue: {
    type: Number,
    required: [true, 'Minimum order value is required'],
    min: 0
  },
  estimatedDeliveryTime: {
    type: String,
    default: '24-48 hours'
  },
  activeServices: {
    type: Number,
    default: 0,
    min: 0
  },
  coverage: {
    type: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [-0.1276, 51.5074], 
      validate: {
        validator: function (val) {
          return !val || (Array.isArray(val) && val.length === 2);
        },
        message: 'Coordinates must be an array of [longitude, latitude]'
      }
    }
  }
}, {
  timestamps: true
});



module.exports = mongoose.model('ServiceArea', ServiceAreaSchema);
