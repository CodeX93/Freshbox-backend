const express = require("express");
const {
  createPlans,
  getAllPlans,
  createCheckoutSession,
  verifyPortalSession,
  createCheckoutOrder,
  createCheckoutOrderPaypal,
} = require("../controllers/payment.controller");

const paymentRoutes = express.Router();

paymentRoutes.post("/addPlan", createPlans);
paymentRoutes.get("/plans", getAllPlans);

paymentRoutes.post("/create-checkout-session", createCheckoutSession);
paymentRoutes.post("/verify-portal-session", verifyPortalSession);
paymentRoutes.post("/create-payment-session-stripe", createCheckoutOrder);
paymentRoutes.post("/create-payment-session-paypal", createCheckoutOrderPaypal);

module.exports = paymentRoutes;
