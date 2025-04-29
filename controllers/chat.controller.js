const Order = require("../model/order");
const Chat = require("../model/chat")

const createFirstChat =async (req, res) => {
    try {
      const { orderId, riderId } = req.body;
      
      if (!orderId || !riderId) {
        return res.status(400).json({ success:false,message: 'Order ID and Rider ID are required' });
      }
      
      // Check if order exists and get user ID
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({success:false, message: 'Order not found' });
      }
      
      // Check if chat already exists
      const existingChat = await Chat.findOne({ orderId });
      if (existingChat) {
        return res.status(409).json({ success:false,message: 'Chat already exists for this order' });
      }
      
      // Create new chat with welcome message
      const newChat = new Chat({
        orderId,
        userId: order.user,
        riderId,
        messages: [
          {
            sender: 'rider',
            senderId: riderId,
            content: 'Your order has been assigned me. You can communicate with me here.',
            timestamp: new Date(),
            isRead: false
          }
        ]
      });
      
      await newChat.save();
      
      // Notify connected users through socket (implementation in socketServer.js)
      const io = req.app.get('io');
      io.to(`order_${orderId}`).emit('chat_created', { chat: newChat });
      
      res.status(201).json({ success: true, chat: newChat });
      
    } catch (error) {
      console.error('Create chat error:', error);
      res.status(500).json({ success:false,message: 'Server error', error: error.message });
    }
  };

  const getChatByOrderId =async (req, res) => {
    try {
      const { orderId } = req.params;
      
      // Find chat
      const chat = await Chat.findOne({ orderId });
      if (!chat) {
        return res.status(404).json({ success:false,message: 'Chat not found' });
      }
      
      
      res.status(200).json({ success:true,chat });
      
    } catch (error) {
      console.error('Get chat error:', error);
      res.status(500).json({ success:false,message: 'Server error', error: error.message });
    }
  };

  const allUserChats = async (req, res) => {
    try {
      const userId = req.user.id;
      
      const chats = await Chat.find({ userId })
        .sort({ lastUpdated: -1 })
        .populate('orderId', 'status')
        .populate('riderId', 'name profilePicture');
      
      res.status(200).json({ success:true,chats });
      
    } catch (error) {
      console.error('Get user chats error:', error);
      res.status(500).json({ success:false,message: 'Server error', error: error.message });
    }
  };

  const allRiderChats =async (req, res) => {
    try {
      const riderId = req.user.id;
      
      const chats = await Chat.find({ riderId })
        .sort({ lastUpdated: -1 })
        .populate('orderId', 'status')
        .populate('userId', 'name profilePicture');
      
      res.status(200).json({ success:true,chats });
      
    } catch (error) {
      console.error('Get rider chats error:', error);
      res.status(500).json({ success:false, message: 'Server error', error: error.message });
    }
  };

  module.exports = {
    createFirstChat,
    getChatByOrderId,
    allUserChats,
    allRiderChats
  };