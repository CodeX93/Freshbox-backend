const mongoose = require('mongoose');

// Define a proper message schema
const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ["Customer", "Support"],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true }); 

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
    type: String
  },
  category: {
    type: String,
    enum: ["general", "order", "service", "billing", "feedback", "technical", "commercial", "other"],
    required: true
  },
  orderNumber: {
    type: String
  },

  messages: [messageSchema],
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High", "Urgent"],
    default: "Medium"
  },
  status: {
    type: String,
    enum: ["Open", "In Progress", "Closed", "Pending Customer Response"],
    default: "Open"
  },
}, { timestamps: true });

const SupportTicket = mongoose.model("SupportTicket", SupportTicketSchema);
module.exports = SupportTicket;
