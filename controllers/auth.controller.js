const User = require("../model/user");
const { SENDGRID_EMAIL, sendMail } = require("../utils/email");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, username, phoneNumber } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, and password are required",
      });
    }

      const existUnVerifiedUser = await User.findOneAndDelete({ email,emailVerified:false })
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
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

    // Create new user
    const user = new User({
      name,
      email,
      password,
      username,
      phoneNumber,
      otp,
      otpExpiry,
      emailVerified: false,
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    // Set token cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      message: "User registered successfully. Please verify your email.",
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
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

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email })
      .select("+password")
      .populate("plan");

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (user.status === "inactive") {
      return res
        .status(400)
        .json({ success: false, message: "You are inactive" });
    }

    const isValidPassword = await user.isPasswordCorrect(password);

    if (!isValidPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
   

    return res.status(200).json({
      message: "Login successful",
      success: true,
      user,
      token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message, success: false });
  }
};


const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      message: "User updated successfully",
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password")
      .populate("plan");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user,
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

    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.emailVerified) {
      return res
        .status(400)
        .json({ success: false, message: "Email already verified" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (Date.now() > user.otpExpiry) {
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired" });
    }

    // Mark as verified and clear OTP
    user.emailVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

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

    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.emailVerified) {
      return res
        .status(400)
        .json({ success: false, message: "Email is already verified" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    await sendMail({
      to: email,
      from: SENDGRID_EMAIL,
      subject: "Resend OTP - FreshBox",
      html: `<p>Hello ${user.name},</p><p>Your new OTP for email verification is: <strong>${otp}</strong></p><p>This OTP is valid for 10 minutes.</p>`,
    });

    return res
      .status(200)
      .json({ success: true, message: "OTP resent successfully" });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const addPaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    let newMethod = req.body;

    const user = await User.findById(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Generate a random ID
    const randomId = crypto.randomBytes(8).toString("hex");
    newMethod.id = randomId;

    // If isDefault is true, make all others false
    if (newMethod.isDefault) {
      user.paymentMethods.forEach((method) => (method.isDefault = false));
    }

    user.paymentMethods.push(newMethod);
    await user.save();
    res.status(200).json({
      success: true,
      message: "Payment method added successfully",
      paymentMethods: user.paymentMethods,
      user,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Delete a payment method
const deletePaymentMethod = async (req, res) => {
  try {
    const { id, paymentId } = req.params;

    const user = await User.findById(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const methodIndex = user.paymentMethods.findIndex(
      (method) => method.id === paymentId
    );
    if (methodIndex === -1)
      return res
        .status(404)
        .json({ success: false, message: "Payment method not found" });

    const wasDefault = user.paymentMethods[methodIndex].isDefault;
    user.paymentMethods.splice(methodIndex, 1);

    if (wasDefault && user.paymentMethods.length > 0) {
      user.paymentMethods[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Payment method deleted successfully",
      user,
      paymentMethods: user.paymentMethods,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const setDefaultPaymentMethod = async (req, res) => {
  try {
    const { id, paymentId } = req.params;

    const user = await User.findById(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    let found = false;

    user.paymentMethods = user.paymentMethods.map((method) => {
      if (method.id === paymentId) {
        found = true;
        return { ...method.toObject(), isDefault: true };
      }
      return { ...method.toObject(), isDefault: false };
    });

    if (!found) {
      return res
        .status(404)
        .json({ success: false, message: "Payment method not found" });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Default payment method updated",
      user,
      paymentMethods: user.paymentMethods,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { id, status } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.status = status;
    await user.save();

    return res.status(200).json({
      success: true,
      status: user.status,
      user,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
module.exports = {
  registerUser,
  loginUser,
  updateUser,
  getUser,
  verifyEmail,
  resendOtp,
  getAllUsers,
  deletePaymentMethod,
  addPaymentMethod,
  setDefaultPaymentMethod,
  updateUserStatus,
};
