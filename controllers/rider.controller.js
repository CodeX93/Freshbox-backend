const Rider = require("../model/rider");
const { SENDGRID_EMAIL, sendMail } = require("../utils/email");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Generate JWT token
const generateToken = (rider) => {
  return jwt.sign({ id: rider._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const registerRider = async (req, res) => {
  try {
    const { name, email, password, Ridername, phoneNumber } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, and password are required",
      });
    }
    const existUnVerifiedRider = await Rider.findOneAndDelete({ email,emailVerified:false })

    // Check if Rider already exists
    const existingRider = await Rider.findOne({ email });
    if (existingRider) {
      return res
        .status(400)
        .json({ success: false, message: "Rider already exists" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    // Send email using SendGrid
    await sendMail({
      to: email,
      from: SENDGRID_EMAIL,
      subject: "Verify your email - FreshBox",
      html: `<p>Hello ${name},</p><p>Your OTP for email verification is: <strong>${otp}</strong></p><p>This OTP is valid for 10 minutes.</p>`,
    });

    // Create new Rider
    const rider = new Rider({
      name,
      email,
      password,
      Ridername,
      phoneNumber,
      otp,
      otpExpiry,
      emailVerified: false,
    });

    await rider.save();

    // Generate JWT token
    const token = generateToken(rider);

    // Set token cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      message: "Rider registered successfully. Please verify your email.",
      success: true,
      rider,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message || "Server error",
      success: false,
    });
  }
};

const loginRider = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const rider = await Rider.findOne({ email })
      .select("+password")


    if (!rider) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (rider.status === "inactive") {
      return res
        .status(400)
        .json({ success: false, message: "You are inactive" });
    }

    const isValidPassword = await rider.isPasswordCorrect(password);

    if (!isValidPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(rider);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
   

    return res.status(200).json({
      message: "Login successful",
      success: true,
      rider,
      token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message, success: false });
  }
};


const updateRider = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedRider = await Rider.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!updatedRider) {
      return res
        .status(404)
        .json({ success: false, message: "Rider not found" });
    }

    return res.status(200).json({
      message: "Rider updated successfully",
      success: true,
      rider: updatedRider,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

const getRider = async (req, res) => {
  try {
    const { id } = req.params;

    const rider = await Rider.findById(id)
      .select("-password")


    if (!rider) {
      return res
        .status(404)
        .json({ success: false, message: "Rider not found" });
    }

    return res.status(200).json({
      success: true,
      rider,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
 

    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required" });
    }

    const rider = await Rider.findOne({ email });


    if (!rider) {
      return res
        .status(404)
        .json({ success: false, message: "Rider not found" });
    }

    if (rider.emailVerified) {
      return res
        .status(400)
        .json({ success: false, message: "Email already verified" });
    }

    if (rider.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (Date.now() > rider.otpExpiry) {
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired" });
    }

    // Mark as verified and clear OTP
    rider.emailVerified = true;
    rider.otp = null;
    rider.otpExpiry = null;
    await rider.save();

    return res
      .status(200)
      .json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const rider = await Rider.findOne({ email });

    if (!rider) {
      return res
        .status(404)
        .json({ success: false, message: "Rider not found" });
    }

    if (rider.emailVerified) {
      return res
        .status(400)
        .json({ success: false, message: "Email is already verified" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    rider.otp = otp;
    rider.otpExpiry = otpExpiry;
    await rider.save();

    await sendMail({
      to: email,
      from: SENDGRID_EMAIL,
      subject: "Resend OTP - FreshBox",
      html: `<p>Hello ${rider.name},</p><p>Your new OTP for email verification is: <strong>${otp}</strong></p><p>This OTP is valid for 10 minutes.</p>`,
    });

    return res
      .status(200)
      .json({ success: true, message: "OTP resent successfully" });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAllRiders = async (req, res) => {
  try {
    const riders = await Rider.find().select("-password");

    return res.status(200).json({
      success: true,
      count: riders.length,
      riders,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


const updateRiderStatus = async (req, res) => {
  try {
    const { id, status } = req.params;
    const rider = await Rider.findById(id);
    if (!rider) {
      return res
        .status(404)
        .json({ success: false, message: "Rider not found" });
    }

    rider.status = status;
    await rider.save();

    return res.status(200).json({
      success: true,
      status: rider.status,
      rider,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
module.exports = {
  registerRider,
  loginRider,
  updateRider,
  getRider,
  verifyEmail,
  resendOtp,
  getAllRiders,
  updateRiderStatus,
};
