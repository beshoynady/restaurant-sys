import express from "express";
import authenticationSettingsController from "./authentication-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";
import {
  createAuthenticationSettingsSchema,
  updateAuthenticationSettingsSchema,
  paramsAuthenticationSettingsSchema,
  paramsAuthenticationSettingsIdsSchema,
  queryAuthenticationSettingsSchema,
} from "./authentication-settings.validation.js";

const router = express.Router();

// IAM Platform Redesign (V4.0): Owner Controlled Authentication — the policy CRUD surface. No
// checkModuleEnabled() here deliberately: authentication is core platform infrastructure, not a
// toggleable business feature module (matches the existing convention for role.router.js /
// user-account.router.js, which also have none).

router.route("/")
  .post(authenticateToken, authorize("AuthenticationSettings", "create"), validate(createAuthenticationSettingsSchema), authenticationSettingsController.create)
  .get(authenticateToken, authorize("AuthenticationSettings", "read"), validate(queryAuthenticationSettingsSchema), authenticationSettingsController.getAll);

router.route("/:id")
  .get(authenticateToken, authorize("AuthenticationSettings", "read"), validate(paramsAuthenticationSettingsSchema, "params"), authenticationSettingsController.getOne)
  .put(authenticateToken, authorize("AuthenticationSettings", "update"), validate(updateAuthenticationSettingsSchema), authenticationSettingsController.update)
  .delete(authenticateToken, authorize("AuthenticationSettings", "delete"), validate(paramsAuthenticationSettingsSchema, "params"), authenticationSettingsController.hardDelete);

router.patch("/soft-delete/:id", authenticateToken, authorize("AuthenticationSettings", "delete"), validate(paramsAuthenticationSettingsSchema, "params"), authenticationSettingsController.softDelete);
router.patch("/restore/:id", authenticateToken, authorize("AuthenticationSettings", "update"), validate(paramsAuthenticationSettingsSchema, "params"), authenticationSettingsController.restore);

router.delete("/bulk-delete", authenticateToken, authorize("AuthenticationSettings", "delete"), validate(paramsAuthenticationSettingsIdsSchema), authenticationSettingsController.bulkHardDelete);
router.patch("/bulk-soft-delete", authenticateToken, authorize("AuthenticationSettings", "delete"), validate(paramsAuthenticationSettingsIdsSchema), authenticationSettingsController.bulkSoftDelete);

export default router;
