const SupportTicket = require("../model/support");


const createSupportTicket = async (req, res) => {
  try {

    const ticket = await SupportTicket.create(req.body);
    res.status(201).json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getAllSupportTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find().populate('from'); 
    res.status(200).json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).populate('from');
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    res.status(200).json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    res.status(200).json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    res.status(200).json({ success: true, message: "Ticket deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createSupportTicket,
  getAllSupportTickets,
  getSupportTicket,
  updateSupportTicket,
  deleteSupportTicket,
};
