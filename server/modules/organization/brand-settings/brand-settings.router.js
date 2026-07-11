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
  authorize("BrandSettings", "read"),
  controller.get
);

/* CREATE */
router.post(
  "/:brandId",
  authenticateToken,
  authorize("BrandSettings", "create"),
  validate(createBrandSettingsSchema),
  controller.create
);

/* UPDATE */
router.patch(
  "/:brandId",
  authenticateToken,
  authorize("BrandSettings", "update"),
  validate(updateBrandSettingsSchema),
  controller.update
);

/* TOGGLE MODULE */
router.patch(
  "/:brandId/module",
  authenticateToken,
  authorize("BrandSettings", "update"),
  validate(toggleModuleSchema),
  controller.toggleModule
);

/* SOFT DELETE */
router.delete(
  "/:brandId",
  authenticateToken,
  authorize("BrandSettings", "delete"),
  controller.softDelete
);

/* RESTORE */
router.patch(
  "/:brandId/restore",
  authenticateToken,
  authorize("BrandSettings", "update"),
  controller.restore
);

export default router;
