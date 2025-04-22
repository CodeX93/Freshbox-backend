const mongoose = require("mongoose");

const featureSchema = new mongoose.Schema({
  text: { type: String, required: true },
  included: { type: Boolean, required: true },
});

const pricingSchema = new mongoose.Schema({
  biweekly: { type: Number, default: null },
  monthly: { type: Number, default: null },
  quarterly: { type: Number, default: null },
  annual: { type: Number, default: null },
});

const planSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    pricing: { type: pricingSchema, required: true },
    features: [featureSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", planSchema);
