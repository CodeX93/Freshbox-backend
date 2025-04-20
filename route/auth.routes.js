const express = require("express");
const {
  registerUser,
  loginUser,
  getUser,
  updateUser,
  verifyEmail,
  getAllUsers,
  resendOtp,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  updateUserStatus
} = require("../controllers/auth.controller");

const userRoutes = express.Router();

userRoutes.post("/register", registerUser);
userRoutes.post("/verify",verifyEmail)
userRoutes.post("/login", loginUser);
userRoutes.get("/:id", getUser);
userRoutes.put("/update/:id", updateUser);
userRoutes.post("/resend-otp", resendOtp);
userRoutes.get("/", getAllUsers); 
userRoutes.post("/crate-payment-method/:id",addPaymentMethod );
userRoutes.delete("/delete-payment-method/:id/:paymentId", deletePaymentMethod); 
userRoutes.put("/set-as-default-method/:id/:paymentId", setDefaultPaymentMethod); 
userRoutes.put("/status/:id/:status", updateUserStatus);

module.exports = userRoutes;
