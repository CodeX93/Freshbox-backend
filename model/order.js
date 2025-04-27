const mongoose = require("mongoose");

const { Schema, model, Types } = mongoose;
const stepSchema = new Schema(
  {
    status: {
      type: String,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    note: {
      type: String,
    },
    timestamp: {
      type: Date,
    },
  },
  { _id: false }
);

const addressSchema = new Schema(
  {
    addressType: {
      type: String,
      enum: ["home", "office"],
      default: "home",
      lowercase: true,
      trim: true,
    },
    postcode: {
      type: String,
      trim: true,
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine2: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const orderItemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    priceType: {
      type: String,
      required: true,
    },
    pricePerItem: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    currentStep: {
      type: Number,
      default: 1,
    },
    category: {
      type: String,
      trim: true,
    },
    specifications: [{ type: String }],
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    items: {
      type: [orderItemSchema],
      validate: [(v) => v.length > 0, "Order must contain at least one item."],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    deliveryAddress: addressSchema,

    user: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "assign",
        "processing",
        "delivered",
        "scheduled",
        "ready",
        "cancelled"
      ],
      default: "processing",
      lowercase: true,
    },
    steps: {
      type: [stepSchema],
      default: [
        { status: "Ordered", note: "Order placed", completed: false },
        {
          status: "Assigned",
          note: "Assigned to rider Emily",
          completed: false,
        },
        { status: "Picked Up", note: "Picked up by rider", completed: false },
        {
          status: "In Progress",
          note: "Processing at Elite Cleaners",
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
    },
    currentStep: {
      type: Number,
      default: 0,
    },
    paymentType: {
      type: String,
      enum: ["card", "paypal"],
      required: true,
      lowercase: true,
    },
    rider: {
      type: Types.ObjectId,
      ref: "Rider",
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Order", orderSchema);
