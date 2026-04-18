import express from "express";
import purchaseSettingsController from "../../controllers/purchasing/purchase-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPurchaseSettingsSchema, 
  updatePurchaseSettingsSchema, 
  paramsPurchaseSettingsSchema, 
  paramsPurchaseSettingsIdsSchema,
  queryPurchaseSettingsSchema 
} from "../../validation/purchasing/purchase-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPurchaseSettingsSchema), purchaseSettingsController.create)
  .get(authenticateToken, validate(queryPurchaseSettingsSchema), purchaseSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsPurchaseSettingsSchema), purchaseSettingsController.getOne)
  .put(authenticateToken, validate(updatePurchaseSettingsSchema), purchaseSettingsController.update)
  .delete(authenticateToken, validate(paramsPurchaseSettingsSchema), purchaseSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPurchaseSettingsSchema), purchaseSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPurchaseSettingsSchema), purchaseSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPurchaseSettingsIdsSchema), purchaseSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPurchaseSettingsIdsSchema), purchaseSettingsController.bulkSoftDelete);


export default router;
