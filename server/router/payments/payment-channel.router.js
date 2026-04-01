import express from "express";
import paymentChannelController from "../../controllers/payments/payment-channel.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createPaymentChannelSchema, updatePaymentChannelSchema, paymentChannelParamsSchema, paymentChannelQuerySchema } from "../../validation/payments/payment-channel.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPaymentChannelSchema), paymentChannelController.create)
  .get(authenticateToken, validate(paymentChannelQuerySchema), paymentChannelController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paymentChannelParamsSchema), paymentChannelController.getOne)
  .put(authenticateToken, validate(updatePaymentChannelSchema), paymentChannelController.update)
  .delete(authenticateToken, validate(paymentChannelParamsSchema), paymentChannelController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paymentChannelParamsSchema), paymentChannelController.restore)
;

export default router;
