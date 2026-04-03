import express from "express";
import preparationReturnSettingsController from "../../controllers/kitchen/preparation-return-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPreparationReturnSettingsSchema, 
  updatePreparationReturnSettingsSchema, 
  paramsPreparationReturnSettingsSchema, 
  paramsPreparationReturnSettingsIdsSchema,
  queryPreparationReturnSettingsSchema 
} from "../../validation/kitchen/preparation-return-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPreparationReturnSettingsSchema), preparationReturnSettingsController.create)
  .get(authenticateToken, validate(queryPreparationReturnSettingsSchema), preparationReturnSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsPreparationReturnSettingsSchema), preparationReturnSettingsController.getOne)
  .put(authenticateToken, validate(updatePreparationReturnSettingsSchema), preparationReturnSettingsController.update)
  .delete(authenticateToken, validate(paramsPreparationReturnSettingsSchema), preparationReturnSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPreparationReturnSettingsSchema), preparationReturnSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPreparationReturnSettingsSchema), preparationReturnSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPreparationReturnSettingsIdsSchema), preparationReturnSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPreparationReturnSettingsIdsSchema), preparationReturnSettingsController.bulkSoftDelete);


export default router;
