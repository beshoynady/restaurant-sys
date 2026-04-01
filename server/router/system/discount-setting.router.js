import express from "express";
import discountSettingController from "../../controllers/system/discount-setting.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createDiscountSettingSchema, 
  updateDiscountSettingSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/system/discount-setting.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createDiscountSettingSchema), discountSettingController.create)
  .get(authenticateToken, validate(querySchema()), discountSettingController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), discountSettingController.getOne)
  .put(authenticateToken, validate(updateDiscountSettingSchema), discountSettingController.update)
  .delete(authenticateToken, validate(paramsSchema()), discountSettingController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), discountSettingController.restore)
;

export default router;
