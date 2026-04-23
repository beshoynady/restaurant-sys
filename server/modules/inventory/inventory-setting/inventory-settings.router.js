import express from "express";
import inventorySettingsController from "../../controllers/inventory/inventory-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createInventorySettingsSchema, 
  updateInventorySettingsSchema, 
  paramsInventorySettingsSchema, 
  paramsInventorySettingsIdsSchema,
  queryInventorySettingsSchema 
} from "../../validation/inventory/inventory-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createInventorySettingsSchema), inventorySettingsController.create)
  .get(authenticateToken, validate(queryInventorySettingsSchema), inventorySettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsInventorySettingsSchema), inventorySettingsController.getOne)
  .put(authenticateToken, validate(updateInventorySettingsSchema), inventorySettingsController.update)
  .delete(authenticateToken, validate(paramsInventorySettingsSchema), inventorySettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsInventorySettingsSchema), inventorySettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsInventorySettingsSchema), inventorySettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsInventorySettingsIdsSchema), inventorySettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsInventorySettingsIdsSchema), inventorySettingsController.bulkSoftDelete);


export default router;
