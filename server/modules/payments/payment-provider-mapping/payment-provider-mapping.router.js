import express from "express";
import paymentProviderMappingController from "./payment-provider-mapping.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createPaymentProviderMappingSchema,
  updatePaymentProviderMappingSchema,
  paramsPaymentProviderMappingSchema,
  paramsPaymentProviderMappingIdsSchema,
  queryPaymentProviderMappingSchema,
} from "./payment-provider-mapping.validation.js";

const RESOURCE = "PaymentProviderMappings";
const MODULE_KEY = "payments";

const router = express.Router();

router.route("/")
  .post(authenticateToken, authorize(RESOURCE, "create"), checkModuleEnabled(MODULE_KEY), validate(createPaymentProviderMappingSchema), paymentProviderMappingController.create)
  .get(authenticateToken, authorize(RESOURCE, "read"), checkModuleEnabled(MODULE_KEY), validate(queryPaymentProviderMappingSchema), paymentProviderMappingController.getAll);

router.route("/:id")
  .get(authenticateToken, authorize(RESOURCE, "read"), checkModuleEnabled(MODULE_KEY), validate(paramsPaymentProviderMappingSchema, "params"), paymentProviderMappingController.getOne)
  .put(authenticateToken, authorize(RESOURCE, "update"), checkModuleEnabled(MODULE_KEY), validate(updatePaymentProviderMappingSchema), paymentProviderMappingController.update)
  .delete(authenticateToken, authorize(RESOURCE, "delete"), checkModuleEnabled(MODULE_KEY), validate(paramsPaymentProviderMappingSchema, "params"), paymentProviderMappingController.hardDelete);

router.route("/soft-delete/:id")
  .patch(authenticateToken, authorize(RESOURCE, "delete"), checkModuleEnabled(MODULE_KEY), validate(paramsPaymentProviderMappingSchema, "params"), paymentProviderMappingController.softDelete);

router.route("/restore/:id")
  .patch(authenticateToken, authorize(RESOURCE, "update"), checkModuleEnabled(MODULE_KEY), validate(paramsPaymentProviderMappingSchema, "params"), paymentProviderMappingController.restore);

router.route("/bulk-delete")
  .delete(authenticateToken, authorize(RESOURCE, "delete"), checkModuleEnabled(MODULE_KEY), validate(paramsPaymentProviderMappingIdsSchema), paymentProviderMappingController.bulkHardDelete);

export default router;
