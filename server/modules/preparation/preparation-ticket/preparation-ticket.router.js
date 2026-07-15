import express from "express";
// Cross-domain final audit finding: this import previously pointed at
// "./kitchen/preparation-ticket.controller.js", a subdirectory that does
// not exist — the controller file has always lived directly in this
// entity's own folder. Fixed as a zero-risk path correction.
import preparationTicketController from "./preparation-ticket.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createPreparationTicketSchema,
  updatePreparationTicketSchema,
  paramsPreparationTicketSchema,
  paramsPreparationTicketIdsSchema,
  queryPreparationTicketSchema
} from "./preparation-ticket.validation.js";

const router = express.Router();

// PLATFORM_FINAL_AUDIT.md PA-07: had authenticateToken only — no
// authorize()/checkModuleEnabled() — and was never mounted. Both fixed
// together; status-transition guarding is enforced in
// preparation-ticket.service.js#update, not here.

// ===== Kitchen Queue / Dashboard (registered before "/:id" to avoid FT-001-style shadowing) =====
router.route("/kitchen-queue").get(
  authenticateToken,
  authorize("PreparationTickets", "read"),
  checkModuleEnabled("preparation"),
  preparationTicketController.kitchenQueue,
);
router.route("/kitchen-dashboard").get(
  authenticateToken,
  authorize("PreparationTickets", "read"),
  checkModuleEnabled("preparation"),
  preparationTicketController.kitchenDashboard,
);

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("PreparationTickets", "create"), checkModuleEnabled("preparation"), validate(createPreparationTicketSchema), preparationTicketController.create)
  .get(authenticateToken, authorize("PreparationTickets", "read"), checkModuleEnabled("preparation"), validate(queryPreparationTicketSchema), preparationTicketController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("PreparationTickets", "read"), checkModuleEnabled("preparation"), validate(paramsPreparationTicketSchema, "params"), preparationTicketController.getOne)
  .put(authenticateToken, authorize("PreparationTickets", "update"), checkModuleEnabled("preparation"), validate(updatePreparationTicketSchema), preparationTicketController.update)
  .delete(authenticateToken, authorize("PreparationTickets", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationTicketSchema, "params"), preparationTicketController.hardDelete) // soft delete
;

// PLATFORM_FINAL_AUDIT.md, corrected: soft-delete/restore/bulk-soft-delete
// removed — PreparationTicket's preparationStatus already covers
// CANCELLED/REJECTED as terminal states.

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, authorize("PreparationTickets", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationTicketIdsSchema), preparationTicketController.bulkHardDelete);


export default router;
