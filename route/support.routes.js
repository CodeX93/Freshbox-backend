// routes/supportTicketRoutes.js
const express = require('express');
const { createSupportTicket, getAllSupportTickets, getSupportTicket, updateSupportTicket, deleteSupportTicket } = require('../controllers/support.controller');
const supportRouter = express.Router();


supportRouter.post('/', createSupportTicket);
supportRouter.get('/', getAllSupportTickets);
supportRouter.get('/:id', getSupportTicket);
supportRouter.put('/:id', updateSupportTicket);
supportRouter.delete('/:id', deleteSupportTicket);

module.exports = supportRouter;
