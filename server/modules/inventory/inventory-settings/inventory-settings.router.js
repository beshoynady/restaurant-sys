import express from "express";
import inventorySettingsController from "./inventory-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createInventorySettingsSchema,
  updateInventorySettingsSchema,
  paramsInventorySettingsSchema,
  paramsInventorySettingsIdsSchema,
  queryInventorySettingsSchema
} from "./inventory-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("InventorySettings", "create"), checkModuleEnabled("inventory"), validate(createInventorySettingsSchema), inventorySettingsController.create)
  .get(authenticateToken, authorize("InventorySettings", "read"), checkModuleEnabled("inventory"), validate(queryInventorySettingsSchema), inventorySettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("InventorySettings", "read"), checkModuleEnabled("inventory"), validate(paramsInventorySettingsSchema, "params"), inventorySettingsController.getOne)
  .put(authenticateToken, authorize("InventorySettings", "update"), checkModuleEnabled("inventory"), validate(updateInventorySettingsSchema), inventorySettingsController.update)
  .delete(authenticateToken, authorize("InventorySettings", "delete"), checkModuleEnabled("inventory"), validate(paramsInventorySettingsSchema, "params"), inventorySettingsController.hardDelete)
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, authorize("InventorySettings", "delete"), checkModuleEnabled("inventory"), validate(paramsInventorySettingsSchema, "params"), inventorySettingsController.softDelete)
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, authorize("InventorySettings", "update"), checkModuleEnabled("inventory"), validate(paramsInventorySettingsSchema, "params"), inventorySettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, authorize("InventorySettings", "delete"), checkModuleEnabled("inventory"), validate(paramsInventorySettingsIdsSchema), inventorySettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken, authorize("InventorySettings", "delete"), checkModuleEnabled("inventory"), validate(paramsInventorySettingsIdsSchema), inventorySettingsController.bulkSoftDelete);


export default router;
