import express from "express";

import brandController from "./brand.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";

import {
  createBrandSchema,
  updateBrandSchema,
  paramsBrandSchema,
  queryBrandSchema,
  changeStatusSchema,
  updateLogoSchema,
  updateBrandSettingsSchema,
  setupProgressSchema,
} from "./brand.validation.js";

const router = express.Router();

/* =========================
   CREATE + LIST
========================= */
router
  .route("/")
  .post(
    authenticateToken,
    authorize("brand:create"),
    validate(createBrandSchema),
    brandController.create
  )
  .get(
    authenticateToken,
    authorize("brand:read"),
    validate(queryBrandSchema, "query"),
    brandController.getAll
  );

/* =========================
   SINGLE BRAND OPS
========================= */
router
  .route("/:id")
  .get(
    authenticateToken,
    authorize("brand:read"),
    validate(paramsBrandSchema, "params"),
    brandController.getOne
  )
  .put(
    authenticateToken,
    authorize("brand:update"),
    validate(updateBrandSchema),
    brandController.update
  )
  .delete(
    authenticateToken,
    authorize("brand:delete"),
    validate(paramsBrandSchema, "params"),
    brandController.hardDelete
  );

/* =========================
   SOFT DELETE / RESTORE
========================= */
router.patch(
  "/soft-delete/:id",
  authenticateToken,
  authorize("brand:delete"),
  validate(paramsBrandSchema, "params"),
  brandController.softDelete
);

router.patch(
  "/restore/:id",
  authenticateToken,
  authorize("brand:restore"),
  validate(paramsBrandSchema, "params"),
  brandController.restore
);

/* =========================
   STATUS CONTROL
========================= */
router.patch(
  "/:id/status",
  authenticateToken,
  authorize("brand:update"),
  validate(paramsBrandSchema, "params"),
  validate(changeStatusSchema),
  brandController.changeStatus
);

/* =========================
   LOGO UPDATE
========================= */
router.patch(
  "/:id/logo",
  authenticateToken,
  authorize("brand:update"),
  validate(paramsBrandSchema, "params"),
  validate(updateLogoSchema),
  brandController.updateLogo
);

/* =========================
   SETTINGS UPDATE
========================= */
router.patch(
  "/:id/settings",
  authenticateToken,
  authorize("brand:update"),
  validate(paramsBrandSchema, "params"),
  validate(updateBrandSettingsSchema),
  brandController.updateSettings
);

/* =========================
   SETUP FLOW
========================= */
router.patch(
  "/:id/setup",
  authenticateToken,
  authorize("brand:update"),
  validate(paramsBrandSchema, "params"),
  validate(setupProgressSchema),
  brandController.updateSetup
);

/* =========================
   SUMMARY (DASHBOARD)
========================= */
router.get(
  "/:id/summary",
  authenticateToken,
  authorize("brand:read"),
  validate(paramsBrandSchema, "params"),
  brandController.getSummary
);

/* =========================
   SEARCH
========================= */
router.get(
  "/search",
  authenticateToken,
  authorize("brand:read"),
  validate(queryBrandSchema, "query"),
  brandController.search
);

export default router;