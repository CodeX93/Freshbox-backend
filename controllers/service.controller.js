// controllers/service.controller.js
const Service = require("../model/service");
const ServiceArea = require("../model/serviceArea");

// Create Service
const createService = async (req, res) => {
  try {
    const service = new Service(req.body);
    await service.save();
    res.status(201).json({ success: true, message: "Service created", service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Services with populated ServiceAreas
const getAllServices = async (req, res) => {
  try {
    const services = await Service.find();
    res.status(200).json({ success: true, services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single Service
const getService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate("availableInServiceAreas");
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    res.status(200).json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Service
const updateService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    res.status(200).json({ success: true, message: "Service updated", service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Service
const deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    res.status(200).json({ success: true, message: "Service deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Toggle Active/Inactive for Service
const toggleServiceStatus = async (req, res) => {
    try {
        const {status} = req.params;
 
      const service = await Service.findById(req.params.id);
      if (!service) {
        return res.status(404).json({ success: false, message: "Service not found" });
      }
      service.isActive = status;
      await service.save();
  
      res.status(200).json({ success: true, message: `Service is now ${service.isActive ? "active" : "inactive"}`, status:service.isActive  });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
    const getAvailableServices = async (req, res) => {
      try {
        const services = await Service.find({ isActive: true });
      
        return res.status(200).json({ success: true, count: services.length, services });
      } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
      }
    };
  
  
  module.exports = {
    createService,
    getAllServices,
    getService,
    updateService,
    deleteService,
    toggleServiceStatus,
    getAvailableServices
  };
