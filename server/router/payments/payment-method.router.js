import express from "express";
import paymentMethodController from "../../controllers/payments/payment-method.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPaymentMethodSchema, 
  updatePaymentMethodSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/payments/payment-method.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPaymentMethodSchema), paymentMethodController.create)
  .get(authenticateToken, validate(querySchema()), paymentMethodController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), paymentMethodController.getOne)
  .put(authenticateToken, validate(updatePaymentMethodSchema), paymentMethodController.update)
  .delete(authenticateToken, validate(paramsSchema()), paymentMethodController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), paymentMethodController.restore)
;

export default router;
