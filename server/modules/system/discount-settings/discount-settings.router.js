import express from "express";
import discountSettingsController from "./discount-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createDiscountSettingsSchema, 
  updateDiscountSettingsSchema, 
  paramsDiscountSettingsSchema, 
  paramsDiscountSettingsIdsSchema,
  queryDiscountSettingsSchema 
} from "./discount-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("DiscountSettings", "create"),
    checkModuleEnabled("sales"), validate(createDiscountSettingsSchema), discountSettingsController.create)
  .get(authenticateToken,
    authorize("DiscountSettings", "read"),
    checkModuleEnabled("sales"), validate(queryDiscountSettingsSchema), discountSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("DiscountSettings", "read"),
    checkModuleEnabled("sales"), validate(paramsDiscountSettingsSchema), discountSettingsController.getOne)
  .put(authenticateToken,
    authorize("DiscountSettings", "update"),
    checkModuleEnabled("sales"), validate(updateDiscountSettingsSchema), discountSettingsController.update)
  .delete(authenticateToken,
    authorize("DiscountSettings", "delete"),
    checkModuleEnabled("sales"), validate(paramsDiscountSettingsSchema), discountSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("DiscountSettings", "delete"),
    checkModuleEnabled("sales"), validate(paramsDiscountSettingsSchema), discountSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("DiscountSettings", "update"),
    checkModuleEnabled("sales"), validate(paramsDiscountSettingsSchema), discountSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("DiscountSettings", "delete"),
    checkModuleEnabled("sales"), validate(paramsDiscountSettingsIdsSchema), discountSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("DiscountSettings", "delete"),
    checkModuleEnabled("sales"),validate(paramsDiscountSettingsIdsSchema), discountSettingsController.bulkSoftDelete);


export default router;
