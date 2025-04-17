
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ServiceArea=require('../model/serviceArea');


// Controller Methods
const controller = {
  /**
   * Get all service areas
   */
  getAllServiceAreas: async (req, res) => {
    try {
      const { active } = req.query;
      let query = {};
      
      if (active !== undefined) {
        query.isActive = active === 'true';
      }
      
      const serviceAreas = await ServiceArea.find(query).sort({ city: 1, zipCode: 1 });
      
      res.status(200).json({
        success: true,
        count: serviceAreas.length,
        data: serviceAreas
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving service areas',
        error: error.message
      });
    }
  },

  /**
   * Get service area by zip code
   */
  getServiceAreaByZipCode: async (req, res) => {
    try {
      const serviceArea = await ServiceArea.findOne({ zipCode: req.params.zipCode });
      
      if (!serviceArea) {
        return res.status(404).json({
          success: false,
          message: 'Service area not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: serviceArea
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving service area',
        error: error.message
      });
    }
  },

  /**
   * Get service areas by city
   */
  getServiceAreasByCity: async (req, res) => {
    try {
      const city = req.params.city;
      const serviceAreas = await ServiceArea.find({ 
        city: { $regex: new RegExp(city, 'i') }
      });
      
      res.status(200).json({
        success: true,
        count: serviceAreas.length,
        data: serviceAreas
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving service areas by city',
        error: error.message
      });
    }
  },

  /**
   * Get service areas by state
   */
  getServiceAreasByState: async (req, res) => {
    try {
      const state = req.params.state;
      const serviceAreas = await ServiceArea.find({ 
        state: { $regex: new RegExp(state, 'i') }
      });
      
      res.status(200).json({
        success: true,
        count: serviceAreas.length,
        data: serviceAreas
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving service areas by state',
        error: error.message
      });
    }
  },

  /**
   * Create a new service area
   */
  createServiceArea: async (req, res) => {
    try {
      // Check if zip code already exists
      const existingZipCode = await ServiceArea.findOne({ zipCode: req.body.zipCode });
      
      if (existingZipCode) {
        return res.status(400).json({
          success: false,
          message: 'Service area with this zip code already exists'
        });
      }
      
      const serviceArea = await ServiceArea.create(req.body);
      
      res.status(201).json({
        success: true,
        data: serviceArea
      });
    } catch (error) {
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        
        return res.status(400).json({
          success: false,
          message: 'Validation Error',
          errors: messages
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating service area',
        error: error.message
      });
    }
  },

  /**
   * Update a service area
   */
  updateServiceArea: async (req, res) => {
    try {
      const { zipCode } = req.params;
      
      // Prevent changing the zip code itself since it's used as an identifier
      if (req.body.zipCode && req.body.zipCode !== zipCode) {
        return res.status(400).json({
          success: false,
          message: 'Zip code cannot be changed'
        });
      }
      
      const serviceArea = await ServiceArea.findOneAndUpdate(
        { zipCode },
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!serviceArea) {
        return res.status(404).json({
          success: false,
          message: 'Service area not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: serviceArea
      });
    } catch (error) {
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        
        return res.status(400).json({
          success: false,
          message: 'Validation Error',
          errors: messages
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating service area',
        error: error.message
      });
    }
  },

  /**
   * Update service area active status
   */
  updateServiceAreaStatus: async (req, res) => {
    try {
      const { isActive } = req.body;
      
      if (isActive === undefined) {
        return res.status(400).json({
          success: false,
          message: 'isActive field is required'
        });
      }
      
      const serviceArea = await ServiceArea.findOneAndUpdate(
        { zipCode: req.params.zipCode },
        { isActive },
        { new: true }
      );
      
      if (!serviceArea) {
        return res.status(404).json({
          success: false,
          message: 'Service area not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: serviceArea
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating service area status',
        error: error.message
      });
    }
  },

  /**
   * Delete a service area
   */
  deleteServiceArea: async (req, res) => {
    try {
      const { zipCode } = req.params;
      
      // Get Service model from the service module
      const Service = mongoose.model('Service');
      
      // Check if any services are using this zip code
      const servicesUsingZipCode = await Service.countDocuments({
        availableInZipCodes: zipCode
      });
      
      if (servicesUsingZipCode > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete service area. It is being used by ${servicesUsingZipCode} services`
        });
      }
      
      const serviceArea = await ServiceArea.findOneAndDelete({ zipCode });
      
      if (!serviceArea) {
        return res.status(404).json({
          success: false,
          message: 'Service area not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Service area deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting service area',
        error: error.message
      });
    }
  }
};

// Routes
/**
 * @route   GET /api/serviceArea
 * @desc    Get all service areas
 * @access  Public
 */
router.get('/', controller.getAllServiceAreas);

/**
 * @route   GET /api/serviceArea/:zipCode
 * @desc    Get service area by zip code
 * @access  Public
 */
router.get('/:zipCode', controller.getServiceAreaByZipCode);

/**
 * @route   GET /api/serviceArea/city/:city
 * @desc    Get service areas by city
 * @access  Public
 */
router.get('/city/:city', controller.getServiceAreasByCity);

/**
 * @route   GET /api/serviceArea/state/:state
 * @desc    Get service areas by state
 * @access  Public
 */
router.get('/state/:state', controller.getServiceAreasByState);

/**
 * @route   POST /api/serviceArea
 * @desc    Create a new service area
 * @access  Private (Admin only)
 */
router.post('/', controller.createServiceArea);

/**
 * @route   PUT /api/serviceArea/:zipCode
 * @desc    Update a service area
 * @access  Private (Admin only)
 */
router.put('/:zipCode', controller.updateServiceArea);

/**
 * @route   PATCH /api/serviceArea/:zipCode/status
 * @desc    Update service area active status
 * @access  Private (Admin only)
 */
router.patch('/:zipCode/status', controller.updateServiceAreaStatus);

/**
 * @route   DELETE /api/serviceArea/:zipCode
 * @desc    Delete a service area
 * @access  Private (Admin only)
 */
router.delete('/:zipCode', controller.deleteServiceArea);

module.exports = {
  router,
  
};