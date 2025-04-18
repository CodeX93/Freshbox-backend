const express = require("express");
const {
  registerUser,
  loginUser,
  getUser,
  updateUser,
  verifyEmail
} = require("../controllers/auth.controller");

const userRoutes = express.Router();

userRoutes.post("/register", registerUser);
userRoutes.post("/verify",verifyEmail)
userRoutes.post("/login", loginUser);
userRoutes.get("/:id", getUser);
userRoutes.put("/update/:id", updateUser);

module.exports = userRoutes;
