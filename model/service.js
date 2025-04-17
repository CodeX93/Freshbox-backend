// api/service/model.js
const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be greater than 0']
  },
  priceType: {
    type: String,
    required: [true, 'Price type is required'],
    enum: ['per item', 'per lb', 'per set', 'per stain']
  },
  estimatedTime: {
    type: Number,
    required: [true, 'Estimated time is required'],
    min: [1, 'Estimated time must be greater than 0']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  availableInZipCodes: {
    type: [String],
    validate: {
      validator: function(zipCodes) {
        return zipCodes && zipCodes.length > 0;
      },
      message: 'Service must be available in at least one zip code'
    }
  },
  imageUrl: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Standard', 'Premium', 'Specialized', 'Add-on', 'Business']
  },
  specifications: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});



module.exports = mongoose.model('Service', ServiceSchema);