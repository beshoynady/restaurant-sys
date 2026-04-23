import express from "express";
import paymentChannelController from "./payments/payment-channel.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPaymentChannelSchema, 
  updatePaymentChannelSchema, 
  paramsPaymentChannelSchema, 
  paramsPaymentChannelIdsSchema,
  queryPaymentChannelSchema 
} from "../../validation/payments/payment-channel.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPaymentChannelSchema), paymentChannelController.create)
  .get(authenticateToken, validate(queryPaymentChannelSchema), paymentChannelController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsPaymentChannelSchema), paymentChannelController.getOne)
  .put(authenticateToken, validate(updatePaymentChannelSchema), paymentChannelController.update)
  .delete(authenticateToken, validate(paramsPaymentChannelSchema), paymentChannelController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPaymentChannelSchema), paymentChannelController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPaymentChannelSchema), paymentChannelController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPaymentChannelIdsSchema), paymentChannelController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPaymentChannelIdsSchema), paymentChannelController.bulkSoftDelete);


export default router;
