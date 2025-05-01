const mongoose = require("mongoose");
const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ["user", "rider"],
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "sender",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
});

const chatSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Rider",
    required: true,
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  status:{
    type: String,
    enum: ["active", "arcived"],
    default:"active"
  }
});

const Chat = mongoose.model("Chat", chatSchema);
module.exports = Chat;
