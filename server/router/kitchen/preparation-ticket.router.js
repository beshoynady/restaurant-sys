import express from "express";
import preparationTicketController from "../../controllers/kitchen/preparation-ticket.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPreparationTicketSchema, 
  updatePreparationTicketSchema, 
  paramsPreparationTicketSchema, 
  paramsPreparationTicketIdsSchema,
  queryPreparationTicketSchema 
} from "../../validation/kitchen/preparation-ticket.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPreparationTicketSchema), preparationTicketController.create)
  .get(authenticateToken, validate(queryPreparationTicketSchema), preparationTicketController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsPreparationTicketSchema), preparationTicketController.getOne)
  .put(authenticateToken, validate(updatePreparationTicketSchema), preparationTicketController.update)
  .delete(authenticateToken, validate(paramsPreparationTicketSchema), preparationTicketController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPreparationTicketSchema), preparationTicketController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPreparationTicketSchema), preparationTicketController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPreparationTicketIdsSchema), preparationTicketController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPreparationTicketIdsSchema), preparationTicketController.bulkSoftDelete);


export default router;
