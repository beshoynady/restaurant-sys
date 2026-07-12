import express from "express";
import controller from "./brand-settings.controller.js";

import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";

import {
  createBrandSettingsSchema,
  updateBrandSettingsSchema,
  paramsBrandSettingsSchema,
  paramsIdsBrandSettingsSchema,
  queryBrandSettingsSchema,
  toggleModuleSchema,
} from "./brand-settings.validation.js";

const router = express.Router();

// =====================================================
// BRAND-SCOPED (primary access pattern — one settings doc per brand)
// =====================================================
// BREAKING CHANGE: previously mounted directly at "/:brandId" (root level),
// which is a single-segment path param indistinguishable from the generic
// "/:id" admin routes below — adding standard CRUD (per this module's
// modernization) would have made the two collide. Moved under "/brand/:brandId",
// matching the same convention branch-settings.router.ts and
// delivery-area.router.ts already use for their branch-scoped routes.

router.get(
  "/brand/:brandId",
  authenticateToken,
  authorize("BrandSettings", "read"),
  controller.getByBrand,
);

router.post(
  "/brand/:brandId",
  authenticateToken,
  authorize("BrandSettings", "create"),
  validate(createBrandSettingsSchema),
  controller.createForBrand,
);

router.patch(
  "/brand/:brandId",
  authenticateToken,
  authorize("BrandSettings", "update"),
  validate(updateBrandSettingsSchema),
  controller.updateForBrand,
);

router.patch(
  "/brand/:brandId/module",
  authenticateToken,
  authorize("BrandSettings", "update"),
  validate(toggleModuleSchema),
  controller.toggleModule,
);

router.delete(
  "/brand/:brandId",
  authenticateToken,
  authorize("BrandSettings", "delete"),
  controller.softDeleteForBrand,
);

router.patch(
  "/brand/:brandId/restore",
  authenticateToken,
  authorize("BrandSettings", "update"),
  controller.restoreForBrand,
);

// =====================================================
// GENERIC ADMIN CRUD (new — addressed by the settings document's own _id;
// same shape as every other module's admin routes, for platform tooling)
// =====================================================

router
  .route("/")
  .post(
    authenticateToken,
    authorize("BrandSettings", "create"),
    validate(createBrandSettingsSchema),
    controller.create,
  )
  .get(
    authenticateToken,
    authorize("BrandSettings", "read"),
    validate(queryBrandSettingsSchema, "query"),
    controller.getAll,
  );

router
  .route("/:id")
  .get(
    authenticateToken,
    authorize("BrandSettings", "read"),
    validate(paramsBrandSettingsSchema, "params"),
    controller.getOne,
  )
  .put(
    authenticateToken,
    authorize("BrandSettings", "update"),
    validate(paramsBrandSettingsSchema, "params"),
    validate(updateBrandSettingsSchema),
    controller.update,
  )
  .delete(
    authenticateToken,
    authorize("BrandSettings", "delete"),
    validate(paramsBrandSettingsSchema, "params"),
    controller.hardDelete,
  );

router.patch(
  "/soft-delete/:id",
  authenticateToken,
  authorize("BrandSettings", "delete"),
  validate(paramsBrandSettingsSchema, "params"),
  controller.softDelete,
);

router.patch(
  "/restore/:id",
  authenticateToken,
  authorize("BrandSettings", "update"),
  validate(paramsBrandSettingsSchema, "params"),
  controller.restore,
);

router.delete(
  "/bulk-delete",
  authenticateToken,
  authorize("BrandSettings", "delete"),
  validate(paramsIdsBrandSettingsSchema),
  controller.bulkHardDelete,
);

router.patch(
  "/bulk-soft-delete",
  authenticateToken,
  authorize("BrandSettings", "delete"),
  validate(paramsIdsBrandSettingsSchema),
  controller.bulkSoftDelete,
);

export default router;
