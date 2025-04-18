const User = require("../model/user");
const { SENDGRID_EMAIL, sendMail } = require("../utils/email");
const jwt =require("jsonwebtoken") ;



// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

const registerUser = async (req, res) => {
    try {
      const { name, email, password, username, phoneNumber } = req.body;

      if ( !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Name, and password are required",
        });
      }
  
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
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const isValidPassword = await user.isPasswordCorrect(password);

        if (!isValidPassword) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const token = generateToken(user);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            message: 'Login successful',
            success: true,
            user,
            token
        });

    } catch (error) {
      console.log(error)
        return res.status(500).json({ message: error.message, success: false });
    }
};

const updateUser = async (req, res) => {
    try {
      const { id } = req.params;
        const updates = req.body;

        const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            message: 'User updated successfully',
            success: true,
            user: updatedUser
        });

    } catch (error) {
        return res.status(500).json({ message: error.message, success: false });
    }
};

const getUser = async (req, res) => {
    try {
        const id = req.params; 

        const user = await User.findById(id).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        return res.status(500).json({ message: error.message, success: false });
    }
};
const verifyEmail = async (req, res) => {
    try {
      const { email, otp } = req.body;
  
      if (!email || !otp) {
        return res.status(400).json({ success: false, message: "Email and OTP are required" });
      }
  
      const user = await User.findOne({ email });
  
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      if (user.emailVerified) {
        return res.status(400).json({ success: false, message: "Email already verified" });
      }
  
      if (user.otp !== otp) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }
  
      if (Date.now() > user.otpExpiry) {
        return res.status(400).json({ success: false, message: "OTP has expired" });
      }
  
      // Mark as verified and clear OTP
      user.emailVerified = true;
      user.otp = null;
      user.otpExpiry = null;
      await user.save();
  
      return res.status(200).json({ success: true, message: "Email verified successfully" });
    } catch (error) {
      console.error("OTP Verification Error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

module.exports = {registerUser,loginUser,updateUser,getUser,verifyEmail}