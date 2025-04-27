const ServiceArea = require("../model/serviceArea");

// Create
const createServiceArea = async (req, res) => {
  try {
 
    const area = await ServiceArea.create(req.body);
    return res.status(201).json({ success: true, message: "Service area created", area });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Read all
const getAllServiceAreas = async (req, res) => {
  try {
    const areas = await ServiceArea.find();
    return res.status(200).json({ success: true, count: areas.length, areas });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Read by ID
const getServiceAreaById = async (req, res) => {
  try {
    const area = await ServiceArea.findById(req.params.id);
    if (!area) return res.status(404).json({ success: false, message: "Service area not found" });
    return res.status(200).json({ success: true, area });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update
const updateServiceArea = async (req, res) => {
  try {
    const area = await ServiceArea.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!area) return res.status(404).json({ success: false, message: "Service area not found" });
    return res.status(200).json({ success: true, message: "Updated successfully", area });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Delete
const deleteServiceArea = async (req, res) => {
  try {
    const area = await ServiceArea.findByIdAndDelete(req.params.id);
    if (!area) return res.status(404).json({ success: false, message: "Service area not found" });
    return res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
const toggleServiceAreaStatus = async (req, res) => {
    try {
        const {status} = req.params;
      
      const area = await ServiceArea.findById(req.params.id);
      if (!area) {
        return res.status(404).json({ success: false, message: "Service area not found" });
      }
      area.isActive = status;
      await area.save();

      res.status(200).json({ success: true, message: `Service area is now ${area.isActive ? "active" : "inactive"}`, status:area.isActive });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  const getAvailableServiceAreas = async (req, res) => {
    try {
      const areas = await ServiceArea.find({ isActive: true });

      return res.status(200).json({ success: true, count: areas.length, areas });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

module.exports = {
  createServiceArea,
  getAllServiceAreas,
  getServiceAreaById,
  updateServiceArea,
  deleteServiceArea,
  toggleServiceAreaStatus,
  getAvailableServiceAreas
};
