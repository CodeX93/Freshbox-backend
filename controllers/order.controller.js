const Order = require("../model/order");
const Rider = require("../model/rider");

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
    const orders = await Order.find().populate("user");
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
    console.log(req.params.id)
    const order = await Order.findById(req.params.id)
      .populate([
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
console.log(order)
    res.status(200).json({ success: true, order });

  } catch (error) {
    console.log(error)
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

const assignOrderToRider = async (req, res) => {
  try {
    const { orderId, riderId } = req.params;
    console.log({orderId, riderId})

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
    console.log(error)
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRiderOrders = async (req, res) => {
  try {
    const { riderId } = req.params;
    console.log(riderId)

    const orders = await Order.find({ rider: riderId })
      .populate([
        {
          path: "user",
          populate: {
            path: "plan", // plan inside user
            model: "Subscription", // model name of subscription
          },
        },
        {
          path: "rider", // rider populate
        },
      ]);

    console.log(orders)  

    res.status(200).json({
      success: true,
      message: "Orders of rider",
      orders,
    });
    
  } catch (error) {
    console.log(error)
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
  getRiderOrders,
  assignOrderToRider
};
