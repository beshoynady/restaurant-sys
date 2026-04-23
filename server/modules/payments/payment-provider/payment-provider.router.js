import express from "express";
import paymentProviderController from "./paymentProvider/payment-provider.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createPaymentProviderSchema, 
  updatePaymentProviderSchema, 
  paramsPaymentProviderSchema, 
  paramsPaymentProviderIdsSchema,
  queryPaymentProviderSchema 
} from "./payment-provider.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPaymentProviderSchema), paymentProviderController.create)
  .get(authenticateToken, validate(queryPaymentProviderSchema), paymentProviderController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsPaymentProviderSchema), paymentProviderController.getOne)
  .put(authenticateToken, validate(updatePaymentProviderSchema), paymentProviderController.update)
  .delete(authenticateToken, validate(paramsPaymentProviderSchema), paymentProviderController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPaymentProviderSchema), paymentProviderController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPaymentProviderSchema), paymentProviderController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPaymentProviderIdsSchema), paymentProviderController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPaymentProviderIdsSchema), paymentProviderController.bulkSoftDelete);


export default router;
