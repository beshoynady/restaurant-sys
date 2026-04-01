import express from "express";
import preparationTicketController from "../../controllers/kitchen/preparation-ticket.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPreparationTicketSchema, 
  updatePreparationTicketSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/kitchen/preparation-ticket.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPreparationTicketSchema), preparationTicketController.create)
  .get(authenticateToken, validate(querySchema()), preparationTicketController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), preparationTicketController.getOne)
  .put(authenticateToken, validate(updatePreparationTicketSchema), preparationTicketController.update)
  .delete(authenticateToken, validate(paramsSchema()), preparationTicketController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), preparationTicketController.restore)
;

export default router;
