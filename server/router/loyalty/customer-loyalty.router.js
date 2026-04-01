import express from "express";
import customerLoyaltyController from "../../controllers/loyalty/customer-loyalty.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createCustomerLoyaltySchema, updateCustomerLoyaltySchema, customerLoyaltyParamsSchema, customerLoyaltyQuerySchema } from "../../validation/loyalty/customer-loyalty.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createCustomerLoyaltySchema), customerLoyaltyController.create)
  .get(authenticateToken, validate(customerLoyaltyQuerySchema), customerLoyaltyController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(customerLoyaltyParamsSchema), customerLoyaltyController.getOne)
  .put(authenticateToken, validate(updateCustomerLoyaltySchema), customerLoyaltyController.update)
  .delete(authenticateToken, validate(customerLoyaltyParamsSchema), customerLoyaltyController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(customerLoyaltyParamsSchema), customerLoyaltyController.restore)
;

export default router;
