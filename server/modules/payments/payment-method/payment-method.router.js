import express from "express";
import paymentMethodController from "./payments/payment-method.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createPaymentMethodSchema, 
  updatePaymentMethodSchema, 
  paramsPaymentMethodSchema, 
  paramsPaymentMethodIdsSchema,
  queryPaymentMethodSchema 
} from "./payment-method.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPaymentMethodSchema), paymentMethodController.create)
  .get(authenticateToken, validate(queryPaymentMethodSchema), paymentMethodController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsPaymentMethodSchema), paymentMethodController.getOne)
  .put(authenticateToken, validate(updatePaymentMethodSchema), paymentMethodController.update)
  .delete(authenticateToken, validate(paramsPaymentMethodSchema), paymentMethodController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPaymentMethodSchema), paymentMethodController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPaymentMethodSchema), paymentMethodController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPaymentMethodIdsSchema), paymentMethodController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPaymentMethodIdsSchema), paymentMethodController.bulkSoftDelete);


export default router;
