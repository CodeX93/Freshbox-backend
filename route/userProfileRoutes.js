// route/userProfileRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../model/user');
const { isAuthenticated } = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

// Debug middleware to log route access 
router.use((req, res, next) => {
  console.log(`[userProfileRoutes] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  if (req.user) {
    console.log(`Authenticated user: ${req.user.id}`);
  } else {
    console.log('User not authenticated');
  }
  next();
});

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profile-pictures');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// IMPORTANT: The route order matters - most specific routes first!

// @route   GET /me
// @desc    Get current user's profile
// @access  Private
router.get('/me', isAuthenticated, async (req, res) => {
  try {
    console.log('[/me route] User ID from request:', req.user.id);
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      console.log('[/me route] User not found in database');
      return res.status(404).json({ msg: 'User not found' });
    }

    console.log('[/me route] User found, returning data');
    res.json(user);
  } catch (err) {
    console.error('[/me route] Error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    console.log(`[/:id route] Looking up user ID: ${req.params.id}`);
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if the requesting user is the same as the requested profile
    // or has admin rights
    if (req.user.id !== user._id.toString() /* && !req.user.isAdmin */) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    res.json(user);
  } catch (err) {
    console.error(`[/:id route] Error:`, err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.status(500).send('Server error');
  }
});

// @route   POST /
// @desc    Register a new user
// @access  Public
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phoneNumber } = req.body;

    try {
      // Check if user exists
      let user = await User.findOne({ 
        $or: [
          { email: email },
          { phoneNumber: phoneNumber }
        ]
      });

      if (user) {
        return res.status(400).json({ msg: 'User already exists' });
      }

      // Create new user
      user = new User({
        name,
        email,
        password,
        phoneNumber
      });

      // Save user to database
      await user.save();

      // Return user data (without password)
      res.status(201).json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET /
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/', isAuthenticated, async (req, res) => {
  // Add admin check here if needed
  // if (!req.user.isAdmin) return res.status(403).json({ msg: 'Not authorized' });
  
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /:id
// @desc    Update user
// @access  Private
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    console.log(`[PUT /:id] Updating user ID: ${req.params.id}`);
    console.log('Request body:', req.body);
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Ensure user can only update their own profile (unless admin)
    if (req.user.id !== user._id.toString() /* && !req.user.isAdmin */) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const { 
      name, 
      email, 
      phoneNumber, 
      address,
      preferences 
    } = req.body;

    // Update basic fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    
    // Add address field to user schema if needed
    if (address !== undefined) {
      // If address doesn't exist in schema, it will be added dynamically
      user.address = address;
    }
    
    // Handle preferences if provided
    if (preferences) {
      // If user doesn't have preferences field yet, initialize it
      if (!user.preferences) {
        user.preferences = {};
      }
      
      // Update each preference field that was provided
      Object.keys(preferences).forEach(key => {
        user.preferences[key] = preferences[key];
      });
    }

    await user.save();
    console.log(`[PUT /:id] User updated successfully`);
    res.json(user);
  } catch (err) {
    console.error(`[PUT /:id] Error:`, err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.status(500).send('Server error');
  }
});

// @route   PUT /:id/password
// @desc    Update user password
// @access  Private
router.put(
  '/:id/password',
  [
    isAuthenticated,
    check('currentPassword', 'Current password is required').exists(),
    check('newPassword', 'Please enter a new password with 6 or more characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.params.id).select('+password');
      
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      // Ensure user can only update their own password
      if (req.user.id !== user._id.toString()) {
        return res.status(403).json({ msg: 'Not authorized' });
      }

      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Current password is incorrect' });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({ msg: 'Password updated successfully' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   PUT /:id/profile-picture
// @desc    Upload/update profile picture
// @access  Private
router.put(
  '/:id/profile-picture',
  [isAuthenticated, upload.single('profilePicture')],
  async (req, res) => {
    try {
      console.log(`[PUT /:id/profile-picture] Uploading picture for user ID: ${req.params.id}`);
      
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      // Ensure user can only update their own profile picture
      if (req.user.id !== user._id.toString() /* && !req.user.isAdmin */) {
        return res.status(403).json({ msg: 'Not authorized' });
      }

      if (!req.file) {
        return res.status(400).json({ msg: 'No file uploaded' });
      }

      // Update profile picture URL
      user.profilePicture = `/uploads/profile-pictures/${req.file.filename}`;
      await user.save();

      console.log(`[PUT /:id/profile-picture] Picture updated successfully`);
      res.json(user);
    } catch (err) {
      console.error(`[PUT /:id/profile-picture] Error:`, err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   PUT /:id/payment-methods
// @desc    Add or update payment methods
// @access  Private
router.put(
  '/:id/payment-methods',
  [
    isAuthenticated,
    [
      check('type', 'Payment method type is required').not().isEmpty(),
      check('last4', 'Last 4 digits are required').isLength({ min: 4, max: 4 }),
      check('expiry', 'Expiry date is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      console.log(`[PUT /:id/payment-methods] Updating payment methods for user ID: ${req.params.id}`);
      console.log('Request body:', req.body);
      
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      // Ensure user can only update their own payment methods
      if (req.user.id !== user._id.toString() /* && !req.user.isAdmin */) {
        return res.status(403).json({ msg: 'Not authorized' });
      }

      const { id, type, last4, expiry, isDefault } = req.body;

      // Initialize payment methods array if it doesn't exist
      if (!user.paymentMethods) {
        user.paymentMethods = [];
      }

      if (id) {
        // Update existing payment method
        const paymentIndex = user.paymentMethods.findIndex(method => method.id === id);
        
        if (paymentIndex === -1) {
          return res.status(404).json({ msg: 'Payment method not found' });
        }

        user.paymentMethods[paymentIndex] = { id, type, last4, expiry, isDefault };
        
        // If this method is set as default, ensure others are not default
        if (isDefault) {
          user.paymentMethods.forEach((method, index) => {
            if (index !== paymentIndex) {
              method.isDefault = false;
            }
          });
        }
      } else {
        // Add new payment method
        const newId = Date.now().toString(); // Simple ID generation
        const newMethod = { id: newId, type, last4, expiry, isDefault: isDefault || false };
        
        // If this is the first payment method or is set as default
        if (user.paymentMethods.length === 0 || isDefault) {
          newMethod.isDefault = true;
          // Set all other methods to not default
          user.paymentMethods.forEach(method => {
            method.isDefault = false;
          });
        }
        
        user.paymentMethods.push(newMethod);
      }

      await user.save();
      console.log(`[PUT /:id/payment-methods] Payment methods updated successfully`);
      res.json(user);
    } catch (err) {
      console.error(`[PUT /:id/payment-methods] Error:`, err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   DELETE /:id/payment-methods/:methodId
// @desc    Delete payment method
// @access  Private
router.delete('/:id/payment-methods/:methodId', isAuthenticated, async (req, res) => {
  try {
    console.log(`[DELETE /:id/payment-methods/:methodId] Deleting payment method ${req.params.methodId} for user ${req.params.id}`);
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Ensure user can only delete their own payment method
    if (req.user.id !== user._id.toString() /* && !req.user.isAdmin */) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Check if payment methods exist
    if (!user.paymentMethods || user.paymentMethods.length === 0) {
      return res.status(404).json({ msg: 'No payment methods found' });
    }

    // Find payment method index
    const methodIndex = user.paymentMethods.findIndex(
      method => method.id === req.params.methodId
    );

    if (methodIndex === -1) {
      return res.status(404).json({ msg: 'Payment method not found' });
    }

    // Check if this is the default method
    const isDefault = user.paymentMethods[methodIndex].isDefault;

    // Remove the payment method
    user.paymentMethods.splice(methodIndex, 1);

    // If the deleted method was the default and other methods exist, set a new default
    if (isDefault && user.paymentMethods.length > 0) {
      user.paymentMethods[0].isDefault = true;
    }

    await user.save();
    console.log(`[DELETE /:id/payment-methods/:methodId] Payment method deleted successfully`);
    res.json({ msg: 'Payment method removed', user });
  } catch (err) {
    console.error(`[DELETE /:id/payment-methods/:methodId] Error:`, err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /:id
// @desc    Delete user
// @access  Private
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Ensure user can only delete their own account (unless admin)
    if (req.user.id !== user._id.toString() /* && !req.user.isAdmin */) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    await User.findByIdAndRemove(req.params.id);
    res.json({ msg: 'User deleted' });
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.status(500).send('Server error');
  }
});

module.exports = router;