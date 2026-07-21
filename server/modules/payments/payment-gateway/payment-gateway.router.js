import express from "express";
import paymentGatewayController from "./payment-gateway.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createPaymentGatewaySchema,
  updatePaymentGatewaySchema,
  paramsPaymentGatewaySchema,
  paramsPaymentGatewayIdsSchema,
  queryPaymentGatewaySchema,
  listAvailableQuerySchema,
} from "./payment-gateway.validation.js";

const MODULE_KEY = "payments";

const router = express.Router();

// "Available" is the real-world entry point most callers need — the global-catalog + this-brand
// union, not the raw collection. Placed before "/" so it never collides with "/:id".
router.get("/available", authenticateToken, authorize("PaymentProviders", "read"), checkModuleEnabled(MODULE_KEY), validate(listAvailableQuerySchema, "query"), paymentGatewayController.listAvailable);

router.route("/")
  .post(authenticateToken, authorize("PaymentProviders", "create"), checkModuleEnabled(MODULE_KEY), validate(createPaymentGatewaySchema), paymentGatewayController.create)
  .get(authenticateToken, authorize("PaymentProviders", "read"), checkModuleEnabled(MODULE_KEY), validate(queryPaymentGatewaySchema), paymentGatewayController.getAll);

router.route("/:id")
  .get(authenticateToken, authorize("PaymentProviders", "read"), checkModuleEnabled(MODULE_KEY), validate(paramsPaymentGatewaySchema, "params"), paymentGatewayController.getOne)
  .put(authenticateToken, authorize("PaymentProviders", "update"), checkModuleEnabled(MODULE_KEY), validate(updatePaymentGatewaySchema), paymentGatewayController.update)
  .delete(authenticateToken, authorize("PaymentProviders", "delete"), checkModuleEnabled(MODULE_KEY), validate(paramsPaymentGatewaySchema, "params"), paymentGatewayController.hardDelete);

router.route("/soft-delete/:id")
  .patch(authenticateToken, authorize("PaymentProviders", "delete"), checkModuleEnabled(MODULE_KEY), validate(paramsPaymentGatewaySchema, "params"), paymentGatewayController.softDelete);

router.route("/restore/:id")
  .patch(authenticateToken, authorize("PaymentProviders", "update"), checkModuleEnabled(MODULE_KEY), validate(paramsPaymentGatewaySchema, "params"), paymentGatewayController.restore);

router.route("/bulk-delete")
  .delete(authenticateToken, authorize("PaymentProviders", "delete"), checkModuleEnabled(MODULE_KEY), validate(paramsPaymentGatewayIdsSchema), paymentGatewayController.bulkHardDelete);

export default router;
