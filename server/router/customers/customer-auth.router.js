import express from "express";
import customerAuthController from "../../controllers/customers/customer-auth.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createCustomerAuthSchema, updateCustomerAuthSchema, customerAuthParamsSchema, customerAuthQuerySchema } from "../../validation/customers/customer-auth.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createCustomerAuthSchema), customerAuthController.create)
  .get(authenticateToken, validate(customerAuthQuerySchema), customerAuthController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(customerAuthParamsSchema), customerAuthController.getOne)
  .put(authenticateToken, validate(updateCustomerAuthSchema), customerAuthController.update)
  .delete(authenticateToken, validate(customerAuthParamsSchema), customerAuthController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(customerAuthParamsSchema), customerAuthController.restore)
;

export default router;
