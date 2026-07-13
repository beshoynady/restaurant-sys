import express from "express";
// Cross-domain final audit finding — same broken-path defect as
// preparation-ticket.router.js (see that file's comment); fixed for the
// same reason.
import preparationSectionController from "./preparation-section.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createPreparationSectionSchema,
  updatePreparationSectionSchema,
  paramsPreparationSectionSchema,
  paramsPreparationSectionIdsSchema,
  queryPreparationSectionSchema
} from "./preparation-section.validation.js";

const router = express.Router();

// PLATFORM_FINAL_AUDIT.md PA-07: same missing-RBAC defect as
// preparation-ticket.router.js — fixed the same way.

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("PreparationSections", "create"), checkModuleEnabled("preparation"), validate(createPreparationSectionSchema), preparationSectionController.create)
  .get(authenticateToken, authorize("PreparationSections", "read"), checkModuleEnabled("preparation"), validate(queryPreparationSectionSchema), preparationSectionController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("PreparationSections", "read"), checkModuleEnabled("preparation"), validate(paramsPreparationSectionSchema, "params"), preparationSectionController.getOne)
  .put(authenticateToken, authorize("PreparationSections", "update"), checkModuleEnabled("preparation"), validate(updatePreparationSectionSchema), preparationSectionController.update)
  .delete(authenticateToken, authorize("PreparationSections", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationSectionSchema, "params"), preparationSectionController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, authorize("PreparationSections", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationSectionSchema, "params"), preparationSectionController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, authorize("PreparationSections", "update"), checkModuleEnabled("preparation"), validate(paramsPreparationSectionSchema, "params"), preparationSectionController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, authorize("PreparationSections", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationSectionIdsSchema), preparationSectionController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken, authorize("PreparationSections", "delete"), checkModuleEnabled("preparation"), validate(paramsPreparationSectionIdsSchema), preparationSectionController.bulkSoftDelete);


export default router;
