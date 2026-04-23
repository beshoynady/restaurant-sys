import express from "express";
import printSettingsController from "./print-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
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
  .post(authenticateToken, validate(createPrintSettingsSchema), printSettingsController.create)
  .get(authenticateToken, validate(queryPrintSettingsSchema), printSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsPrintSettingsSchema), printSettingsController.getOne)
  .put(authenticateToken, validate(updatePrintSettingsSchema), printSettingsController.update)
  .delete(authenticateToken, validate(paramsPrintSettingsSchema), printSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPrintSettingsSchema), printSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPrintSettingsSchema), printSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPrintSettingsIdsSchema), printSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPrintSettingsIdsSchema), printSettingsController.bulkSoftDelete);


export default router;
