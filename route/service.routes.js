// routes/service.routes.js
const express = require("express");
const {
  createService,
  getAllServices,
  getService,
  updateService,
  deleteService,
  toggleServiceStatus,
  getAvailableServices
} = require("../controllers/service.controller");

const serviceRouter = express.Router();

serviceRouter.post("/", createService);
serviceRouter.get("/", getAllServices);
serviceRouter.get("/avaliable", getAvailableServices); 
serviceRouter.put("/:id/toggle/:status", toggleServiceStatus); 
serviceRouter.put("/:id", updateService);
serviceRouter.delete("/:id", deleteService);


module.exports = serviceRouter;
