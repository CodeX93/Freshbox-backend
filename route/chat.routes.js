const express = require("express");
const {
  createFirstChat,
  getChatByOrderId,
  allRiderChats,
  allUserChats,
} = require("../controllers/chat.controller");

const chatRoutes = express.Router();

chatRoutes.post("/create", createFirstChat);
chatRoutes.get("/order/:orderId", getChatByOrderId);
chatRoutes.get("/user", allUserChats);
chatRoutes.get("/rider", allRiderChats);

module.exports = chatRoutes;
