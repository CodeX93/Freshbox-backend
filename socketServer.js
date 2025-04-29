const {Server} = require("socket.io");
const Chat = require("./model/chat");
const User = require("./model/user");
const Rider = require("./model/rider");
const Order = require("./model/order");

function setupSocketServer(server) {
  const allowedOrigins = [
    "http://localhost:3001",
    "http://localhost:3000",
    "https://freshbox-frontend.netlify.app",
    "https://adminpanelfreshbox.netlify.app",
    "https://rider-freshbox.netlify.app"
  ];

  const io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Store online users
  const onlineUsers = new Map();
  const onlineRiders = new Map();

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // User authentication
    socket.on("authenticate_user", async (userId) => {
      try {
        const user = await User.findById(userId);
        if (user) {
          onlineUsers.set(userId, socket.id);
          socket.userId = userId;
          socket.userType = "user";

          // Join rooms for all active orders
          const activeOrders = await Order.find({
            user: userId,
            status: { $in: ["assign", "scheduled", "ready"] },
          });

          activeOrders.forEach((order) => {
            socket.join(`order_${order._id}`);
          });

          socket.emit("authentication_success", {
            message: "User authenticated successfully",
          });
        } else {
          socket.emit("authentication_error", { message: "User not found" });
        }
      } catch (error) {
        console.error("Authentication error:", error);
        socket.emit("authentication_error", {
          message: "Authentication failed",
        });
      }
    });

    // Rider authentication
    socket.on("authenticate_rider", async (riderId) => {
      try {
        const rider = await Rider.findById(riderId);
        if (rider) {
          onlineRiders.set(riderId, socket.id);
          socket.riderId = riderId;
          socket.userType = "rider";

          // Join rooms for all active assigned orders
          const activeOrders = await Order.find({
            rider: riderId,
            status: {
              $in: ["assign", "scheduled", "ready"],
            },
          });

          activeOrders.forEach((order) => {
            socket.join(`order_${order._id}`);
          });

          socket.emit("authentication_success", {
            message: "Rider authenticated successfully",
          });
        } else {
          socket.emit("authentication_error", { message: "Rider not found" });
        }
      } catch (error) {
        console.error("Authentication error:", error);
        socket.emit("authentication_error", {
          message: "Authentication failed",
        });
      }
    });

    // Join a specific chat room
    socket.on("join_chat", async (orderId) => {
      try {
        socket.join(`order_${orderId}`);
        socket.emit("joined_chat", { orderId });

        // Get chat history
        const chat = await Chat.findOne({ orderId }).populate("messages");
        if (chat) {
          socket.emit("chat_history", { chat });

          // Mark messages as read if user is the recipient
          if (socket.userType === "user") {
            await Chat.updateMany(
              { orderId, "messages.sender": "rider", "messages.isRead": false },
              { $set: { "messages.$[elem].isRead": true } },
              {
                arrayFilters: [
                  { "elem.sender": "rider", "elem.isRead": false },
                ],
              }
            );
          } else if (socket.userType === "rider") {
            await Chat.updateMany(
              { orderId, "messages.sender": "user", "messages.isRead": false },
              { $set: { "messages.$[elem].isRead": true } },
              {
                arrayFilters: [{ "elem.sender": "user", "elem.isRead": false }],
              }
            );
          }

          // Notify other room participants about read messages
          socket.to(`order_${orderId}`).emit("messages_read");
        }
      } catch (error) {
        console.error("Join chat error:", error);
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    // Send a message
    socket.on("send_message", async (data) => {
      try {
        const { orderId, content } = data;

        if (!socket.userType || (!socket.userId && !socket.riderId)) {
          socket.emit("error", {
            message: "You must be authenticated to send messages",
          });
          return;
        }

        // Get the order to confirm it exists and has the right status
        const order = await Order.findById(orderId);
        if (!order) {
          socket.emit("error", { message: "Order not found" });
          return;
        }

        // Check authorization
        if (
          socket.userType === "user" &&
          order.user.toString() !== socket.userId
        ) {
          socket.emit("error", { message: "Unauthorized to access this chat" });
          return;
        }

        if (
          socket.userType === "rider" &&
          order.rider.toString() !== socket.riderId
        ) {
          socket.emit("error", { message: "Unauthorized to access this chat" });
          return;
        }

        // Find or create chat
        let chat = await Chat.findOne({ orderId });

        if (!chat) {
          chat = new Chat({
            orderId,
            userId: order.user,
            riderId: order.rider,
            messages: [],
          });
        }

        // Create the message
        const newMessage = {
          sender: socket.userType,
          senderId: socket.userType === "user" ? socket.userId : socket.riderId,
          content,
          timestamp: new Date(),
          isRead: false,
        };

        // Add message to chat
        chat.messages.push(newMessage);
        chat.lastUpdated = new Date();
        await chat.save();

        // Emit the message to the room
        io.to(`order_${orderId}`).emit("new_message", {
          chatId: chat._id,
          message: newMessage,
        });
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Mark messages as read
    socket.on("mark_messages_read", async (orderId) => {
      try {
        if (!socket.userType) {
          socket.emit("error", { message: "You must be authenticated" });
          return;
        }

        // Update message read status based on who is marking them as read
        if (socket.userType === "user") {
          await Chat.updateMany(
            { orderId, "messages.sender": "rider", "messages.isRead": false },
            { $set: { "messages.$[elem].isRead": true } },
            { arrayFilters: [{ "elem.sender": "rider", "elem.isRead": false }] }
          );
        } else if (socket.userType === "rider") {
          await Chat.updateMany(
            { orderId, "messages.sender": "user", "messages.isRead": false },
            { $set: { "messages.$[elem].isRead": true } },
            { arrayFilters: [{ "elem.sender": "user", "elem.isRead": false }] }
          );
        }

        // Notify other participants
        socket.to(`order_${orderId}`).emit("messages_read", {
          orderId,
          readBy: socket.userType,
        });
      } catch (error) {
        console.error("Mark read error:", error);
        socket.emit("error", { message: "Failed to mark messages as read" });
      }
    });

    // Get unread message counts
    socket.on("get_unread_counts", async () => {
      try {
        if (!socket.userType) {
          socket.emit("error", { message: "You must be authenticated" });
          return;
        }

        let chats;
        if (socket.userType === "user") {
          chats = await Chat.find({ userId: socket.userId });
        } else if (socket.userType === "rider") {
          chats = await Chat.find({ riderId: socket.riderId });
        }

        const unreadCounts = {};

        chats.forEach((chat) => {
          const otherSender = socket.userType === "user" ? "rider" : "user";
          const unreadCount = chat.messages.filter(
            (msg) => msg.sender === otherSender && !msg.isRead
          ).length;

          if (unreadCount > 0) {
            unreadCounts[chat.orderId] = unreadCount;
          }
        });

        socket.emit("unread_counts", { unreadCounts });
      } catch (error) {
        console.error("Get unread counts error:", error);
        socket.emit("error", { message: "Failed to get unread counts" });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);

      if (socket.userType === "user" && socket.userId) {
        onlineUsers.delete(socket.userId);
      } else if (socket.userType === "rider" && socket.riderId) {
        onlineRiders.delete(socket.riderId);
      }
    });
  });

  return io;
}

module.exports = setupSocketServer;
