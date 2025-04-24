const Order = require("../model/order");  

const createOrder = async (req, res) => {
    try {
      const orderData = {
        ...req.body,
        steps: [
          {
            label: "Order Placed",
            completed: true,
            date: new Date(),
          },
          { label: "Picked Up", completed: false },
          { label: "Cleaning", completed: false },
          { label: "Quality Check", completed: false },
          { label: "Out for Delivery", completed: false },
          { label: "Delivered", completed: false },
        ],
      };
  
      const order = new Order(orderData);
      await order.save();

      res.status(201).json({
        success: true,
        message: "Order created",
        order,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  


const getAllOrders = async (_req, res) => {
  try {
    const orders = await Order.populate("user");
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.userId });
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")          // optional
      .populate("items.productId");            // if items reference products

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, message: "Order updated", order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, message: "Order deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const toggleOrderStatus = async (req, res) => {
  try {
    const { status } = req.params; 
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to ${order.status}`,
      status: order.status,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getUserOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  toggleOrderStatus,
};
