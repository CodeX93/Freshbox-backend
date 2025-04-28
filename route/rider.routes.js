const express = require("express");

const {updateRiderStatus,
  registerRider,
  verifyEmail,
  loginRider,
  getRider,
  updateRider,
  resendOtp,
  getAllRiders,
  updateOnlineStatus,
} = require("../controllers/rider.controller");

const riderRoutes = express.Router();

riderRoutes.post("/register", registerRider);
riderRoutes.post("/verify", verifyEmail);
riderRoutes.post("/login", loginRider);
riderRoutes.get("/:id", getRider);
riderRoutes.put("/update/:id", updateRider);
riderRoutes.post("/resend-otp", resendOtp);
riderRoutes.get("/", getAllRiders);
riderRoutes.put("/status/:id/:status", updateRiderStatus);
riderRoutes.put("/online/:id/:online", updateOnlineStatus);

module.exports = riderRoutes;
