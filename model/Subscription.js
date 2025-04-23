const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      required: true,
      index: true,
    },
    stripeCustomerId: {
      type: String,
      required: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    planName: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        "active",
        "past_due",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "trialing",
        "unpaid",
      ],
      required: true,
      index: true,
    },
    monthlyItems: {
      type: Number,
      required: true,
      default: 0,
    },
    itemsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    cancellationDate: {
      type: Date,
    },
    nextBillingDate: {
      type: Date,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly", "one-time"],
      default: "monthly",
    },
    availableTokens: {
      type: String,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    paymentMethod: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware for auto-calculating next billing date
subscriptionSchema.pre("save", function (next) {
  if (this.isNew || this.isModified("startDate")) {
    const nextBillingDate = new Date(this.startDate);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    this.nextBillingDate = nextBillingDate;
    this.expiryDate = nextBillingDate;
  }
  next();
});

// Instance methods
subscriptionSchema.methods = {
  isActive() {
    return this.status === "active" && new Date() < this.expiryDate;
  },
  async cancel() {
    this.cancelAtPeriodEnd = true;
    this.cancellationDate = new Date();
    return this.save();
  },
};

const Subscription = mongoose.model("Subscription", subscriptionSchema);
module.exports = Subscription;
