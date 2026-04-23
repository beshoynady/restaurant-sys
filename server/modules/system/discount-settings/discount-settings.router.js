import express from "express";
import discountSettingsController from "./discount-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
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
  .post(authenticateToken, validate(createDiscountSettingsSchema), discountSettingsController.create)
  .get(authenticateToken, validate(queryDiscountSettingsSchema), discountSettingsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsDiscountSettingsSchema), discountSettingsController.getOne)
  .put(authenticateToken, validate(updateDiscountSettingsSchema), discountSettingsController.update)
  .delete(authenticateToken, validate(paramsDiscountSettingsSchema), discountSettingsController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsDiscountSettingsSchema), discountSettingsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsDiscountSettingsSchema), discountSettingsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsDiscountSettingsIdsSchema), discountSettingsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsDiscountSettingsIdsSchema), discountSettingsController.bulkSoftDelete);


export default router;
