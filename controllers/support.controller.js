const SupportTicket = require("../model/support");
const { sendMail, SENDGRID_EMAIL } = require("../utils/email");

const createSupportTicket = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      category,
      orderNumber,
      message,
      from,
      priority,
    } = req.body;

    const ticket = await SupportTicket.create({
      name,
      email,
      phone,
      category,
      orderNumber,
      from,
      priority,
      messages: [
        {
          sender: "Customer",
          message: message,
          timestamp: new Date(),
        },
      ],
    });



    res.status(201).json({ success: true, ticket });
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllSupportTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find().populate("from");
    res.status(200).json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).populate("from");
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
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
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
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
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Ticket deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const sendSupportResponse = async (req, res) => {
  try {

    const { message, email } = req.body; 
    const { id } = req.params; 


    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    ticket.messages.push({
      sender: "Support",
      message: message,
      timestamp: new Date()
    });
    ticket.status="In Progress";

    await ticket.save(); 

    await sendMail({
      to: email,
      from: SENDGRID_EMAIL,
      subject: "Support Response - FreshBox",
      html: `
        <p>Hello,</p>
        <p>Our support team has responded to your ticket:</p>
        <blockquote>${message}</blockquote>
        <p>If you have further questions, feel free to reply.</p>
        <p>Thank you,<br/>FreshBox Support Team</p>
      `,
    });

    res.status(200).json({ success: true, message: "Response sent and ticket updated." });
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {
  createSupportTicket,
  getAllSupportTickets,
  getSupportTicket,
  updateSupportTicket,
  deleteSupportTicket,
  sendSupportResponse,
};
