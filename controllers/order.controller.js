const Order = require("../model/order");
const Rider = require("../model/rider");
const Chat = require("../model/chat")


const createOrder = async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      steps: [
        {
          status: "Ordered",
          note: "Order placed",
          completed: true,
          timestamp: new Date(),
        },
        {
          status: "Assigned",
          note: "Assigned to rider",
          completed: false,
        },
        { status: "Picked Up", note: "Picked up by rider", completed: false },
        {
          status: "In Progress",
          note: "Processing at Cleaners",
          completed: false,
        },
        {
          status: "Ready for Delivery",
          note: "Processing complete, ready for delivery",
          completed: false,
        },
        {
          status: "Delivered",
          note: "Delivered to customer",
          completed: false,
        },
      ],
      currentStep: 1,
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
    const orders = await Order.find().populate("user").populate("rider");

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
    const order = await Order.findById(req.params.id).populate([
      {
        path: "user",
        populate: {
          path: "plan",
          model: "Subscription",
        },
      },
      {
        path: "rider", // populate rider
      },
    ]);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.log(error);
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

const statusToStep = {
  processing: 0,
  assign: 1,
  scheduled: 2,
  ready: 3,
  delivered: 5,
  cancelled: -1,
};

const toggleOrderStatus = async (req, res) => {
  try {
    const { id, status } = req.params;

    // Validate status
    if (!(status in statusToStep)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status provided",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update order status and step
    order.status = status;
    order.currentStep = statusToStep[status];

    // Update steps based on status
    switch (status) {
      case "scheduled":
        order.steps[2].completed = true;
        order.steps[2].timestamp = new Date();
        break;

      case "ready":
        order.steps[3].completed = true;
        order.steps[3].timestamp = new Date();
        order.steps[4].completed = true;
        order.steps[4].timestamp = new Date();
        break;

      case "delivered":
        order.steps[5].completed = true;
        order.steps[5].timestamp = new Date();
        break;

      case "cancelled":
        // Optional: Handle cancellations
        break;
    }

    await order.save();

    // 🔁 Update related chat status
    const chatStatus = status === "delivered" ? "archived" : "active";
    const chat = await Chat.findOneAndUpdate({ orderId: id }, { status: chatStatus },{new:true});
    console.log(chat)

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      status: order.status,
      currentStep: order.currentStep,
      steps: order.steps,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const assignOrderToRider = async (req, res) => {
  try {
    const { orderId, riderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const rider = await Rider.findById(riderId);
    if (!rider) {
      return res
        .status(404)
        .json({ success: false, message: "Rider not found" });
    }

    // Assign rider and status
    order.rider = rider._id;
    order.status = "assign";
    order.currentStep = 2;

    const assignedStep = order.steps.find((step) => step.status === "Assigned");
    assignedStep.completed = true;
    assignedStep.timestamp = new Date();

    await order.save();

    rider.activeOrders = rider.activeOrders + 1;
    await rider.save();

    res.status(200).json({
      success: true,
      message: `Order assigned to ${rider.name} and updated`,
      status: order.status,
      order,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRiderOrders = async (req, res) => {
  try {
    const { riderId } = req.params;

    const orders = await Order.find({ rider: riderId }).populate([
      {
        path: "user",
        populate: {
          path: "plan",
          model: "Subscription",
        },
      },
      {
        path: "rider", // rider populate
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Orders of rider",
      orders,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const changeOrderStepStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { note, status } = req.body;

    const validStatus = String(status).toLowerCase().replace(/\s+/g, '');

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Invalid status provided",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update order steps based on status
    switch (validStatus) {
      case "assigned":
        order.status = "assign";
        order.currentStep = 1;
        order.steps[1] = {
          status: "Assigned",
          completed: true,
          timestamp: new Date(),
          note: note || order.steps[1].note,
        };
        break;

      case "pickedup":
        order.status = "scheduled";
        order.currentStep = 2;
        order.steps[2] = {
          status: "Picked Up",
          completed: true,
          timestamp: new Date(),
          note: note || order.steps[2].note,
        };
        break;

      case "inprogress":
        order.status = "scheduled";
        order.currentStep = 2;
        order.steps[3] = {
          status: "In Progress",
          completed: true,
          timestamp: new Date(),
          note: note || order.steps[3].note,
        };
        break;

      case "readyfordelivery":
        order.status = "ready";
        order.currentStep = 3;
        order.steps[4] = {
          status: "Ready for Delivery",
          completed: true,
          timestamp: new Date(),
          note: note || order.steps[4].note,
        };
        break;

      case "delivered":
        order.status = "delivered";
        order.currentStep = 5;
        order.steps[5] = {
          status: "Delivered",
          completed: true,
          timestamp: new Date(),
          note: note || order.steps[5].note,
        };
        break;

      case "cancelled":
        order.status = "cancelled";
        order.cancellationNote = note || "";
        break;
    }

    // Save the updated order
    await order.save();

    // Update related chat status
    const chatStatus = validStatus === "delivered" ? "archived" : "active";
    await Chat.findOneAndUpdate({ orderId: id }, { status: chatStatus });

    res.status(200).json({
      success: true,
      order: order,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
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
  getRiderOrders,
  assignOrderToRider,
  changeOrderStepStatus,
};
