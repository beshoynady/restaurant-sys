import express from "express";
// Cross-domain final audit finding: this import previously pointed at
// "./kitchen/preparation-ticket.controller.js", a subdirectory that does
// not exist — the controller file has always lived directly in this
// entity's own folder. This router would have thrown `Cannot find module`
// at import time; masked only because it was never mounted in
// router/v1/index.router.js (confirmed by a fresh audit — see
// HR_DOMAIN_FINAL_AUDIT.md). Fixed as a zero-risk path correction; still
// not mounted, so no live behavior changes as a result of this fix alone.
import preparationTicketController from "./preparation-ticket.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createPreparationTicketSchema, 
  updatePreparationTicketSchema, 
  paramsPreparationTicketSchema, 
  paramsPreparationTicketIdsSchema,
  queryPreparationTicketSchema 
} from "./preparation-ticket.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPreparationTicketSchema), preparationTicketController.create)
  .get(authenticateToken, validate(queryPreparationTicketSchema), preparationTicketController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsPreparationTicketSchema, "params"), preparationTicketController.getOne)
  .put(authenticateToken, validate(updatePreparationTicketSchema), preparationTicketController.update)
  .delete(authenticateToken, validate(paramsPreparationTicketSchema, "params"), preparationTicketController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPreparationTicketSchema, "params"), preparationTicketController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPreparationTicketSchema, "params"), preparationTicketController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPreparationTicketIdsSchema), preparationTicketController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPreparationTicketIdsSchema), preparationTicketController.bulkSoftDelete);


export default router;
