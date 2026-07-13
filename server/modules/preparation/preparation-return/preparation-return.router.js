import express from "express";
// Cross-domain final audit finding — same broken-path defect as
// preparation-ticket.router.js (see that file's comment); fixed for the
// same reason.
import preparationReturnController from "./preparation-return.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createPreparationReturnSchema,
  updatePreparationReturnSchema,
  paramsPreparationReturnSchema,
  paramsPreparationReturnIdsSchema,
  queryPreparationReturnSchema
} from "./preparation-return.validation.js";

const router = express.Router();

// PLATFORM_FINAL_AUDIT.md PA-07: same missing-RBAC defect as
// preparation-ticket.router.js — fixed the same way. Status-transition
// guarding is enforced in preparation-return.service.js#update.

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("PreparationReturns", "create"), checkModuleEnabled("preparation"), validate(createPreparationReturnSchema), preparationReturnController.create)
  .get(authenticateToken, authorize("PreparationReturns", "read"), checkModuleEnabled("preparation"), validate(queryPreparationReturnSchema), preparationReturnController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("PreparationReturns", "read"), checkModuleEnabled("preparation"), validate(paramsPreparationReturnSchema, "params"), preparationReturnController.getOne)
  .put(authenticateToken, authorize("PreparationReturns", "update"), checkModuleEnabled("preparation"), validate(updatePreparationReturnSchema), preparationReturnController.update)
  .delete(authenticateToken, authorize("PreparationReturns", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationReturnSchema, "params"), preparationReturnController.hardDelete) // soft delete
;

// PLATFORM_FINAL_AUDIT.md, corrected: soft-delete/restore/bulk-soft-delete
// removed — PreparationReturn's status already covers CANCELLED.

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, authorize("PreparationReturns", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationReturnIdsSchema), preparationReturnController.bulkHardDelete);


export default router;
