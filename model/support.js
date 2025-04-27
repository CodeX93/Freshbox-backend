// models/SupportTicket.js
const mongoose = require('mongoose');

const SupportTicketSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: false
  },
  category: {
    type: String,
    enum: ["general", "order", "service", "billing", "feedback", "technical", "commercial", "other"],
    required: true
  },
  orderNumber: {
    type: String,
    required: false
  },
  message: {
    type: String,
    required: true
  },

  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium"
  },

},{timestamps:true});


const SupportTicket = mongoose.model("SupportTicket", SupportTicketSchema);
module.exports = SupportTicket;