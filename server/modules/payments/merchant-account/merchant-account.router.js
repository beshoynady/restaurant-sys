import express from "express";
import merchantAccountController from "./merchant-account.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createMerchantAccountSchema,
  updateMerchantAccountSchema,
  paramsMerchantAccountSchema,
  paramsMerchantAccountIdsSchema,
  queryMerchantAccountSchema,
} from "./merchant-account.validation.js";

// A DIFFERENT, stricter RBAC resource than PaymentProviders on purpose (see role.model.js's own
// comment on PaymentProviderCredentials) — a role that manages the provider catalog should not
// automatically be trusted with live merchant secrets.
const RESOURCE = "PaymentProviderCredentials";
const MODULE_KEY = "payments";

const router = express.Router();

router.route("/")
  .post(authenticateToken, authorize(RESOURCE, "create"), checkModuleEnabled(MODULE_KEY), validate(createMerchantAccountSchema), merchantAccountController.create)
  .get(authenticateToken, authorize(RESOURCE, "read"), checkModuleEnabled(MODULE_KEY), validate(queryMerchantAccountSchema), merchantAccountController.getAll);

router.route("/:id")
  .get(authenticateToken, authorize(RESOURCE, "read"), checkModuleEnabled(MODULE_KEY), validate(paramsMerchantAccountSchema, "params"), merchantAccountController.getOne)
  .put(authenticateToken, authorize(RESOURCE, "update"), checkModuleEnabled(MODULE_KEY), validate(updateMerchantAccountSchema), merchantAccountController.update)
  .delete(authenticateToken, authorize(RESOURCE, "delete"), checkModuleEnabled(MODULE_KEY), validate(paramsMerchantAccountSchema, "params"), merchantAccountController.hardDelete);

router.route("/soft-delete/:id")
  .patch(authenticateToken, authorize(RESOURCE, "delete"), checkModuleEnabled(MODULE_KEY), validate(paramsMerchantAccountSchema, "params"), merchantAccountController.softDelete);

router.route("/restore/:id")
  .patch(authenticateToken, authorize(RESOURCE, "update"), checkModuleEnabled(MODULE_KEY), validate(paramsMerchantAccountSchema, "params"), merchantAccountController.restore);

router.route("/bulk-delete")
  .delete(authenticateToken, authorize(RESOURCE, "delete"), checkModuleEnabled(MODULE_KEY), validate(paramsMerchantAccountIdsSchema), merchantAccountController.bulkHardDelete);

export default router;
