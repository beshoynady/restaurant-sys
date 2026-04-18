import express from "express";
import discountSettingController from "../../controllers/system/discount-setting.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createDiscountSettingSchema, 
  updateDiscountSettingSchema, 
  paramsDiscountSettingSchema, 
  paramsDiscountSettingIdsSchema,
  queryDiscountSettingSchema 
} from "../../validation/system/discount-setting.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createDiscountSettingSchema), discountSettingController.create)
  .get(authenticateToken, validate(queryDiscountSettingSchema), discountSettingController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsDiscountSettingSchema), discountSettingController.getOne)
  .put(authenticateToken, validate(updateDiscountSettingSchema), discountSettingController.update)
  .delete(authenticateToken, validate(paramsDiscountSettingSchema), discountSettingController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsDiscountSettingSchema), discountSettingController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsDiscountSettingSchema), discountSettingController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsDiscountSettingIdsSchema), discountSettingController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsDiscountSettingIdsSchema), discountSettingController.bulkSoftDelete);


export default router;
