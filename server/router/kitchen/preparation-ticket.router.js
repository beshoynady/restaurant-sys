const express = require("express");
const router = express.Router();
const {
  createPreparationTicket,
  getAllPreparationTickets,
  getActivePreparationTickets,
  getPreparationTicketById,
  updatePreparationTicket,
  deletePreparationTicket,
} = require("../../controllers/kitchen/preparation-ticket.controller");

const {authenticateToken} = require("../../middlewares/authenticate");


router
  .route("/")
  .post(authenticateToken,createPreparationTicket)
  .get(authenticateToken,getAllPreparationTickets);

router
  .route("/activepreparationtickets")
  .get(authenticateToken,getActivePreparationTickets);

router
  .route("/:id")

  .get(authenticateToken,getPreparationTicketById)
  .put(authenticateToken,updatePreparationTicket)
  .delete(authenticateToken,deletePreparationTicket);

module.exports = router;
