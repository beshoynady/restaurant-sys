import express from "express";
import paymentProviderController from "../../controllers/paymentProvider/payment-provider.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createPaymentProviderSchema, updatePaymentProviderSchema, paymentProviderParamsSchema, paymentProviderQuerySchema } from "../../validation/paymentProvider/payment-provider.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPaymentProviderSchema), paymentProviderController.create)
  .get(authenticateToken, validate(paymentProviderQuerySchema), paymentProviderController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paymentProviderParamsSchema), paymentProviderController.getOne)
  .put(authenticateToken, validate(updatePaymentProviderSchema), paymentProviderController.update)
  .delete(authenticateToken, validate(paymentProviderParamsSchema), paymentProviderController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paymentProviderParamsSchema), paymentProviderController.restore)
;

export default router;
