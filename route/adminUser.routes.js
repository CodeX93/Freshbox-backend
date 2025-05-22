const express = require("express");
const { register, signIn, sendResetCode, confirmCode, changePassword, updateUserName } = require("../controllers/adminUser.controller");

const adminUserRouter = express.Router();

adminUserRouter.post("/register", register);
adminUserRouter.post("/login", signIn);
adminUserRouter.post("/send-reset-code", sendResetCode);
adminUserRouter.post("/confirm-reset-code", confirmCode);
adminUserRouter.put("/change-password", changePassword);
adminUserRouter.put("/update", updateUserName);




module.exports = adminUserRouter;
