const Plan = require("../model/plan");

const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    res.status(200).json({ success: true, count: plans.length, plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllPlans };
