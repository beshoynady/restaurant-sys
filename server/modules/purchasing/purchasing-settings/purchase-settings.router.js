import express from "express";
import purchaseSettingsController from "./purchase-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createPurchaseSettingsSchema, 
  updatePurchaseSettingsSchema, 
  paramsPurchaseSettingsSchema, 
  paramsPurchaseSettingsIdsSchema,
  queryPurchaseSettingsSchema 
} from "./purchase-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("PurchaseSettings", "create"),
    checkModuleEnabled("purchasing"), validate(createPurchaseSettingsSchema), purchaseSettingsController.create)
  .get(authenticateToken,
    authorize("PurchaseSettings", "read"),
    checkModuleEnabled("purchasing"), validate(queryPurchaseSettingsSchema), purchaseSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("PurchaseSettings", "read"),
    checkModuleEnabled("purchasing"), validate(paramsPurchaseSettingsSchema), purchaseSettingsController.getOne)
  .put(authenticateToken,
    authorize("PurchaseSettings", "update"),
    checkModuleEnabled("purchasing"), validate(updatePurchaseSettingsSchema), purchaseSettingsController.update)
  .delete(authenticateToken,
    authorize("PurchaseSettings", "delete"),
    checkModuleEnabled("purchasing"), validate(paramsPurchaseSettingsSchema), purchaseSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("PurchaseSettings", "delete"),
    checkModuleEnabled("purchasing"), validate(paramsPurchaseSettingsSchema), purchaseSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("PurchaseSettings", "update"),
    checkModuleEnabled("purchasing"), validate(paramsPurchaseSettingsSchema), purchaseSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("PurchaseSettings", "delete"),
    checkModuleEnabled("purchasing"), validate(paramsPurchaseSettingsIdsSchema), purchaseSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("PurchaseSettings", "delete"),
    checkModuleEnabled("purchasing"),validate(paramsPurchaseSettingsIdsSchema), purchaseSettingsController.bulkSoftDelete);


export default router;
