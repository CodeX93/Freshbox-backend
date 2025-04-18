const express = require("express");
const {
  createServiceArea,
  getAllServiceAreas,
  getServiceAreaById,
  updateServiceArea,
  deleteServiceArea,
  toggleServiceAreaStatus
} = require("../controllers/serviceArea.controller");

const serviceAreaRouter = express.Router();

serviceAreaRouter.post("/", createServiceArea);
serviceAreaRouter.get("/", getAllServiceAreas); 
serviceAreaRouter.put("/:id", updateServiceArea);
serviceAreaRouter.delete("/:id", deleteServiceArea); 
serviceAreaRouter.put("/:id/toggle/:status", toggleServiceAreaStatus); 

module.exports = serviceAreaRouter;
