import express from "express";
import paymentProviderController from "./payment-provider.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createPaymentProviderSchema,
  updatePaymentProviderSchema,
  paramsPaymentProviderSchema,
  paramsPaymentProviderIdsSchema,
  queryPaymentProviderSchema,
  resolveCandidatesQuerySchema,
} from "./payment-provider.validation.js";

const MODULE_KEY = "payments";

const router = express.Router();

router.get("/resolve-candidates", authenticateToken, authorize("PaymentProviders", "read"), checkModuleEnabled(MODULE_KEY), validate(resolveCandidatesQuerySchema, "query"), paymentProviderController.resolveCandidates);

router.route("/")
  .post(authenticateToken, authorize("PaymentProviders", "create"), checkModuleEnabled(MODULE_KEY), validate(createPaymentProviderSchema), paymentProviderController.create)
  .get(authenticateToken, authorize("PaymentProviders", "read"), checkModuleEnabled(MODULE_KEY), validate(queryPaymentProviderSchema), paymentProviderController.getAll);

router.route("/:id")
  .get(authenticateToken, authorize("PaymentProviders", "read"), checkModuleEnabled(MODULE_KEY), validate(paramsPaymentProviderSchema, "params"), paymentProviderController.getOne)
  .put(authenticateToken, authorize("PaymentProviders", "update"), checkModuleEnabled(MODULE_KEY), validate(updatePaymentProviderSchema), paymentProviderController.update)
  .delete(authenticateToken, authorize("PaymentProviders", "delete"), checkModuleEnabled(MODULE_KEY), validate(paramsPaymentProviderSchema, "params"), paymentProviderController.hardDelete);

router.route("/soft-delete/:id")
  .patch(authenticateToken, authorize("PaymentProviders", "delete"), checkModuleEnabled(MODULE_KEY), validate(paramsPaymentProviderSchema, "params"), paymentProviderController.softDelete);

router.route("/restore/:id")
  .patch(authenticateToken, authorize("PaymentProviders", "update"), checkModuleEnabled(MODULE_KEY), validate(paramsPaymentProviderSchema, "params"), paymentProviderController.restore);

router.route("/bulk-delete")
  .delete(authenticateToken, authorize("PaymentProviders", "delete"), checkModuleEnabled(MODULE_KEY), validate(paramsPaymentProviderIdsSchema), paymentProviderController.bulkHardDelete);

export default router;
