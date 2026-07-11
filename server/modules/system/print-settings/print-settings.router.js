import express from "express";
import printSettingsController from "./print-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";
import { 
  createPrintSettingsSchema, 
  updatePrintSettingsSchema, 
  paramsPrintSettingsSchema, 
  paramsPrintSettingsIdsSchema,
  queryPrintSettingsSchema 
} from "./print-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("PrintSettings", "create"), validate(createPrintSettingsSchema), printSettingsController.create)
  .get(authenticateToken,
    authorize("PrintSettings", "read"), validate(queryPrintSettingsSchema), printSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("PrintSettings", "read"), validate(paramsPrintSettingsSchema), printSettingsController.getOne)
  .put(authenticateToken,
    authorize("PrintSettings", "update"), validate(updatePrintSettingsSchema), printSettingsController.update)
  .delete(authenticateToken,
    authorize("PrintSettings", "delete"), validate(paramsPrintSettingsSchema), printSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("PrintSettings", "delete"), validate(paramsPrintSettingsSchema), printSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("PrintSettings", "update"), validate(paramsPrintSettingsSchema), printSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("PrintSettings", "delete"), validate(paramsPrintSettingsIdsSchema), printSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("PrintSettings", "delete"),validate(paramsPrintSettingsIdsSchema), printSettingsController.bulkSoftDelete);


export default router;
