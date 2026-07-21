import express from "express";
import paymentMethodController from "./payment-method.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
  paramsPaymentMethodSchema,
  paramsPaymentMethodIdsSchema,
  queryPaymentMethodSchema,
  resolvePaymentMethodQuerySchema
} from "./payment-method.validation.js";

// V6.0 Production Hardening: this router previously imported its controller from a nonexistent
// path (`./payments/payment-method.controller.js` — no such subfolder exists inside
// `payment-method/`), which would throw "Cannot find module" the moment anything tried to import
// this file — almost certainly why it was never mounted. Also had zero RBAC (`authorize`/
// `checkModuleEnabled` were entirely absent, unlike every other router in this platform). Both
// fixed; mounted at `/finance/payment-methods` (`financial` module key, matching CashRegister's
// convention — PaymentMethod is a financial-configuration resource, not Supply-Chain-specific,
// even though Supply Chain's Supplier Payment/Refund workflow depends on it existing).
const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("PaymentMethods", "create"),
    checkModuleEnabled("financial"), validate(createPaymentMethodSchema), paymentMethodController.create)
  .get(authenticateToken,
    authorize("PaymentMethods", "read"),
    checkModuleEnabled("financial"), validate(queryPaymentMethodSchema), paymentMethodController.getAll)
;

// Enterprise Payment Platform V1 Phase 2 — "given this method + branch + channel + register,
// what actually executes this payment right now" (a CashRegister, or a resolved Provider +
// MerchantAccount pair) — the real answer a checkout flow needs before calling a gateway.
router.get("/:id/resolve",
  authenticateToken,
  authorize("PaymentMethods", "read"),
  checkModuleEnabled("financial"), validate(paramsPaymentMethodSchema, "params"), validate(resolvePaymentMethodQuerySchema, "query"), paymentMethodController.resolve);

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("PaymentMethods", "read"),
    checkModuleEnabled("financial"), validate(paramsPaymentMethodSchema, "params"), paymentMethodController.getOne)
  .put(authenticateToken,
    authorize("PaymentMethods", "update"),
    checkModuleEnabled("financial"), validate(updatePaymentMethodSchema), paymentMethodController.update)
  .delete(authenticateToken,
    authorize("PaymentMethods", "delete"),
    checkModuleEnabled("financial"), validate(paramsPaymentMethodSchema, "params"), paymentMethodController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("PaymentMethods", "delete"),
    checkModuleEnabled("financial"), validate(paramsPaymentMethodSchema, "params"), paymentMethodController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("PaymentMethods", "update"),
    checkModuleEnabled("financial"), validate(paramsPaymentMethodSchema, "params"), paymentMethodController.restore)
;

// --- BULK HARD DELETE ---
router.route("/bulk-delete")
  .delete(authenticateToken,
  authorize("PaymentMethods", "delete"),
  checkModuleEnabled("financial"), validate(paramsPaymentMethodIdsSchema), paymentMethodController.bulkHardDelete);

// --- BULK SOFT DELETE ---
router.route("/bulk-soft-delete")
  .patch(authenticateToken,
  authorize("PaymentMethods", "delete"),
  checkModuleEnabled("financial"), validate(paramsPaymentMethodIdsSchema), paymentMethodController.bulkSoftDelete);

export default router;
