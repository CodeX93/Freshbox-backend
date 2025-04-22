const express = require("express");
const { getAllPlans } = require("../controllers/payment.controller");

const paymentRoutes = express.Router();

paymentRoutes.get("/plans", getAllPlans);

module.exports = paymentRoutes;