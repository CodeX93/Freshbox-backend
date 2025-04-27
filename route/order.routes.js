const express = require("express");
const {
  createOrder,
  getAllOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  toggleOrderStatus,
  getUserOrders,
  getRiderOrders,
  assignOrderToRider,
} = require("../controllers/order.controller");

const orderRouter = express.Router();

orderRouter.post("/", createOrder);
orderRouter.get("/", getAllOrders);
orderRouter.get("/user/:userId", getUserOrders);
orderRouter.get("/:id", getOrder);
orderRouter.put("/:id/status/:status", toggleOrderStatus);
orderRouter.put("/:id", updateOrder);
orderRouter.delete("/:id", deleteOrder);
orderRouter.get("/rider/:riderId", getRiderOrders);
orderRouter.put("/assign-order/:riderId/:orderId", assignOrderToRider);


module.exports = orderRouter;
