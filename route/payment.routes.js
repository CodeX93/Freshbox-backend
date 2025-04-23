const express = require("express");
const {
  getAllPlans,
  createCheckoutSession,
  verifyPortalSession,
  createCheckoutOrder,
  createCheckoutOrderPaypal,
} = require("../controllers/payment.controller");

const paymentRoutes = express.Router();

paymentRoutes.get("/plans", getAllPlans);

paymentRoutes.post("/create-checkout-session", createCheckoutSession);
paymentRoutes.post("/verify-portal-session", verifyPortalSession);
paymentRoutes.post("/create-payment-session-stripe", createCheckoutOrder);
paymentRoutes.post("/create-payment-session-paypal", createCheckoutOrderPaypal);

module.exports = paymentRoutes;
