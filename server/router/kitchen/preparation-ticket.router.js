import express from "express";
const router = express.Router();
import {
  createPreparationTicket,
  getAllPreparationTickets,
  getActivePreparationTickets,
  getPreparationTicketById,
  updatePreparationTicket,
  deletePreparationTicket,
} from "../../controllers/kitchen/preparation-ticket.controller.js";

import {authenticateToken} from "../../middlewares/authenticate.js";


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

export default router;
