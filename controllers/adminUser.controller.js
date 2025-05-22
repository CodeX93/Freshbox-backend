const AdminUser = require("../model/adminUser");
const { SENDGRID_EMAIL, sendMail } = require("../utils/email");
const bcrypt = require("bcryptjs");

const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existing = await AdminUser.findOne({ email });
    if (existing)
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await AdminUser.create({
      name,
      email,
      password: hashedPassword,
    });

    res
      .status(201)
      .json({ success: true, message: "User created successfully" });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: err.message,
    });
  }
};

const signIn = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await AdminUser.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });

    const isValidPassword = await user.isPasswordCorrect(password);
    if (!isValidPassword)
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });

    res.status(200).json({ success: true, user });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Sign in failed", error: err.message });
  }
};

const sendResetCode = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await AdminUser.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Email not found" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.forgetPasswordCode = code;
    await user.save();

    await sendMail({
      to: email,
      from: SENDGRID_EMAIL,
      subject: "Verify your email - FreshBox",
      html: `<p>Hello ${user.name},</p><p>Your OTP to reset password is: <strong>${code}</strong></p><p></p>`,
    });

    res.json({ success: true, message: "Reset code sent to email" });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: err.message,
    });
  }
};

const confirmCode = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res
      .status(400)
      .json({ success: false, message: "Email and code are required" });
  }

  const numericCode = parseInt(code, 10);
  if (isNaN(numericCode)) {
    return res
      .status(400)
      .json({ success: false, message: "Code must be a number" });
  }

  try {
    const user = await AdminUser.findOne({ email });

    if (!user || parseInt(user.forgetPasswordCode, 10) !== numericCode) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid code or email" });
    }
    user.forgetPasswordCode = null;
    await user.save();

    return res.json({ success: true, message: "Code verified" });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Code verification failed",
      error: err.message,
    });
  }
};

const changePassword = async (req, res) => {
  const { email, newPassword } = req.body;

  // Validate input
  if (!email || !newPassword) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Email, code, and new password are required",
      });
  }



  try {
    const user = await AdminUser.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid code or email" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;


    await user.save();

    return res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Password reset failed",
      error: err.message,
    });
  }
};

const updateUserName = async (req, res) => {
  const { email, name } = req.body;

  try {
    const user = await AdminUser.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.name = name;
    await user.save();

    res.json({ success: true, message: "Name updated successfully", user });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to update name",
        error: err.message,
      });
  }
};

module.exports = {
  register,
  signIn,
  sendResetCode,
  confirmCode,
  changePassword,
  updateUserName,
};
