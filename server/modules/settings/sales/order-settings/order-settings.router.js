import express from "express";
import orderSettingsController from "../../controllers/sales/order-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createOrderSettingsSchema, 
  updateOrderSettingsSchema, 
  paramsOrderSettingsSchema, 
  paramsOrderSettingsIdsSchema,
  queryOrderSettingsSchema 
} from "../../validation/sales/order-settings.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createOrderSettingsSchema), orderSettingsController.create)
  .get(authenticateToken, validate(queryOrderSettingsSchema), orderSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsOrderSettingsSchema), orderSettingsController.getOne)
  .put(authenticateToken, validate(updateOrderSettingsSchema), orderSettingsController.update)
  .delete(authenticateToken, validate(paramsOrderSettingsSchema), orderSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsOrderSettingsSchema), orderSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsOrderSettingsSchema), orderSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsOrderSettingsIdsSchema), orderSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsOrderSettingsIdsSchema), orderSettingsController.bulkSoftDelete);


export default router;
