import express from "express";
import controller from "./brand-settings.controller.js";

import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";

import {
  createBrandSettingsSchema,
  updateBrandSettingsSchema,
  paramsBrandSettingsSchema,
  toggleModuleSchema,
} from "./brand-settings.validation.js";

const router = express.Router();

/* GET SETTINGS */
router.get(
  "/:brandId",
  authenticateToken,
  authorize("brand:read"),
  controller.get
);

/* CREATE */
router.post(
  "/:brandId",
  authenticateToken,
  authorize("brand:create"),
  validate(createBrandSettingsSchema),
  controller.create
);

/* UPDATE */
router.patch(
  "/:brandId",
  authenticateToken,
  authorize("brand:update"),
  validate(updateBrandSettingsSchema),
  controller.update
);

/* TOGGLE MODULE */
router.patch(
  "/:brandId/module",
  authenticateToken,
  authorize("brand:update"),
  validate(toggleModuleSchema),
  controller.toggleModule
);

/* SOFT DELETE */
router.delete(
  "/:brandId",
  authenticateToken,
  authorize("brand:delete"),
  controller.softDelete
);

/* RESTORE */
router.patch(
  "/:brandId/restore",
  authenticateToken,
  authorize("brand:restore"),
  controller.restore
);

export default router;
