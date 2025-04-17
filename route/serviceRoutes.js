// api/service.js - Combined routes and controller
const express = require('express');
const router = express.Router();
const ServiceArea = require('../model/serviceArea');

const Service =require('../model/service')



// Controller Methods
const controller = {
  /**
   * Get all services
   */
  getAllServices: async (req, res) => {
    try {
      const { active } = req.query;
      let query = {};
      
      if (active !== undefined) {
        query.isActive = active === 'true';
      }
      
      const services = await Service.find(query).sort({ name: 1 });
      
      res.status(200).json({
        success: true,
        count: services.length,
        data: services
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving services',
        error: error.message
      });
    }
  },

  /**
   * Get service by ID
   */
  getServiceById: async (req, res) => {
    try {
      const service = await Service.findById(req.params.id);
      
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: service
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving service',
        error: error.message
      });
    }
  },

  /**
   * Get services by category
   */
  getServicesByCategory: async (req, res) => {
    try {
      const services = await Service.find({ 
        category: req.params.category 
      });
      
      res.status(200).json({
        success: true,
        count: services.length,
        data: services
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving services by category',
        error: error.message
      });
    }
  },

  /**
   * Get services by zip code
   */
  getServicesByZipCode: async (req, res) => {
    try {
      const services = await Service.find({
        availableInZipCodes: req.params.zipCode
      });
      
      res.status(200).json({
        success: true,
        count: services.length,
        data: services
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving services by zip code',
        error: error.message
      });
    }
  },

  /**
   * Create a new service
   */
  createService: async (req, res) => {
    try {
      // Validate zip codes exist in service areas
      const { availableInZipCodes } = req.body;
      
      if (availableInZipCodes && availableInZipCodes.length > 0) {
        const serviceAreaCount = await ServiceArea.countDocuments({
          zipCode: { $in: availableInZipCodes }
        });
        
        if (serviceAreaCount !== availableInZipCodes.length) {
          return res.status(400).json({
            success: false,
            message: 'One or more zip codes do not exist in service areas'
          });
        }
      }
      
      const service = await Service.create(req.body);
      
      // Update activeServices count in each ServiceArea
      if (availableInZipCodes && availableInZipCodes.length > 0) {
        await ServiceArea.updateMany(
          { zipCode: { $in: availableInZipCodes } },
          { $inc: { activeServices: 1 } }
        );
      }
      
      res.status(201).json({
        success: true,
        data: service
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
        message: 'Error creating service',
        error: error.message
      });
    }
  },

  /**
   * Update a service
   */
  updateService: async (req, res) => {
    try {
      const serviceId = req.params.id;
      
      // Check if service exists
      const existingService = await Service.findById(serviceId);
      if (!existingService) {
        return res.status(404).json({
          success: false,
          message: 'Service not found'
        });
      }
      
      // Get current zip codes
      const currentZipCodes = existingService.availableInZipCodes;
      const newZipCodes = req.body.availableInZipCodes || [];
      
      // Validate new zip codes exist
      if (newZipCodes.length > 0) {
        const serviceAreaCount = await ServiceArea.countDocuments({
          zipCode: { $in: newZipCodes }
        });
        
        if (serviceAreaCount !== newZipCodes.length) {
          return res.status(400).json({
            success: false,
            message: 'One or more zip codes do not exist in service areas'
          });
        }
      }
      
      // Find added and removed zip codes
      const addedZipCodes = newZipCodes.filter(zip => !currentZipCodes.includes(zip));
      const removedZipCodes = currentZipCodes.filter(zip => !newZipCodes.includes(zip));
      
      // Update the service
      const service = await Service.findByIdAndUpdate(
        serviceId,
        req.body,
        { new: true, runValidators: true }
      );
      
      // Update ServiceArea counts
      if (addedZipCodes.length > 0) {
        await ServiceArea.updateMany(
          { zipCode: { $in: addedZipCodes } },
          { $inc: { activeServices: 1 } }
        );
      }
      
      if (removedZipCodes.length > 0) {
        await ServiceArea.updateMany(
          { zipCode: { $in: removedZipCodes } },
          { $inc: { activeServices: -1 } }
        );
      }
      
      res.status(200).json({
        success: true,
        data: service
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
        message: 'Error updating service',
        error: error.message
      });
    }
  },

  /**
   * Update service active status
   */
  updateServiceStatus: async (req, res) => {
    try {
      const { isActive } = req.body;
      
      if (isActive === undefined) {
        return res.status(400).json({
          success: false,
          message: 'isActive field is required'
        });
      }
      
      const service = await Service.findByIdAndUpdate(
        req.params.id,
        { isActive },
        { new: true }
      );
      
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: service
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating service status',
        error: error.message
      });
    }
  },

  /**
   * Delete a service
   */
  deleteService: async (req, res) => {
    try {
      const serviceId = req.params.id;
      
      // Get service to find zip codes
      const service = await Service.findById(serviceId);
      
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service not found'
        });
      }
      
      const zipCodes = service.availableInZipCodes;
      
      // Delete the service
      await Service.findByIdAndDelete(serviceId);
      
      // Update active service counts in service areas
      if (zipCodes.length > 0) {
        await ServiceArea.updateMany(
          { zipCode: { $in: zipCodes } },
          { $inc: { activeServices: -1 } }
        );
      }
      
      res.status(200).json({
        success: true,
        message: 'Service deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting service',
        error: error.message
      });
    }
  },

  /**
   * Search services
   */
  searchServices: async (req, res) => {
    try {
      const searchTerm = req.params.term;
      
      const services = await Service.find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { category: { $regex: searchTerm, $options: 'i' } }
        ]
      });
      
      res.status(200).json({
        success: true,
        count: services.length,
        data: services
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error searching services',
        error: error.message
      });
    }
  }
};

// Routes
/**
 * @route   GET /api/service
 * @desc    Get all services
 * @access  Public
 */
router.get('/', controller.getAllServices);

/**
 * @route   GET /api/service/:id
 * @desc    Get service by ID
 * @access  Public
 */
router.get('/:id', controller.getServiceById);

/**
 * @route   GET /api/service/category/:category
 * @desc    Get services by category
 * @access  Public
 */
router.get('/category/:category', controller.getServicesByCategory);

/**
 * @route   GET /api/service/zipcode/:zipCode
 * @desc    Get services by zip code
 * @access  Public
 */
router.get('/zipcode/:zipCode', controller.getServicesByZipCode);

/**
 * @route   GET /api/service/search/:term
 * @desc    Search services
 * @access  Public
 */
router.get('/search/:term', controller.searchServices);

/**
 * @route   POST /api/service
 * @desc    Create a new service
 * @access  Private (Admin only)
 */
router.post('/', controller.createService);

/**
 * @route   PUT /api/service/:id
 * @desc    Update a service
 * @access  Private (Admin only)
 */
router.put('/:id',  controller.updateService);

/**
 * @route   PATCH /api/service/:id/status
 * @desc    Update service active status
 * @access  Private (Admin only)
 */
router.patch('/:id/status'), 
/**
 * @route   DELETE /api/service/:id
 * @desc    Delete a service
 * @access  Private (Admin only)
 */
router.delete('/:id', controller.deleteService);

module.exports = {
  router
};