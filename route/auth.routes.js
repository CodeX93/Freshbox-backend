const express = require("express");
const {
  registerUser,
  loginUser,
  getUser,
  updateUser,
  verifyEmail,
  getAllUsers,
  resendOtp
} = require("../controllers/auth.controller");

const userRoutes = express.Router();

userRoutes.post("/register", registerUser);
userRoutes.post("/verify",verifyEmail)
userRoutes.post("/login", loginUser);
userRoutes.get("/:id", getUser);
userRoutes.put("/update/:id", updateUser);
userRoutes.post("/resend-otp", resendOtp);
userRoutes.get("/all", getAllUsers); 

module.exports = userRoutes;
