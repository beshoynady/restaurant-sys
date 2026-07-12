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

/* CREATE + LIST */
router
  .route("/")
  .post(authenticateToken, authorize("Brands", "create"), validate(createBrandSchema), brandController.create)
  .get(
    authenticateToken,
    authorize("Brands", "read"),
    validate(queryBrandSchema, "query"),
    brandController.getAll,
  );

/* SEARCH */
router.get("/search", authenticateToken, authorize("Brands", "read"), brandController.search);

/* SETUP STATUS */
router.get(
  "/:id/setup",
  authenticateToken,
  authorize("Brands", "read"),
  brandController.getSetupStatus,
);

/* SUMMARY */
router.get(
  "/:id/summary",
  authenticateToken,
  authorize("Brands", "read"),
  validate(paramsBrandSchema, "params"),
  brandController.getSummary,
);

/* SINGLE */
router
  .route("/:id")
  .get(
    authenticateToken,
    authorize("Brands", "read"),
    validate(paramsBrandSchema, "params"),
    brandController.getOne,
  )
  .put(
    authenticateToken,
    authorize("Brands", "update"),
    validate(paramsBrandSchema, "params"),
    validate(updateBrandSchema),
    brandController.update,
  )
  .delete(
    authenticateToken,
    authorize("Brands", "delete"),
    validate(paramsBrandSchema, "params"),
    brandController.hardDelete,
  );

/* STATUS */
router.patch(
  "/:id/status",
  authenticateToken,
  authorize("Brands", "update"),
  validate(changeStatusSchema),
  brandController.changeStatus,
);

/* LOGO */
router.patch(
  "/:id/logo",
  authenticateToken,
  authorize("Brands", "update"),
  validate(updateLogoSchema),
  brandController.updateLogo,
);

/* SETTINGS */
router.patch(
  "/:id/settings",
  authenticateToken,
  authorize("Brands", "update"),
  validate(updateBrandSettingsSchema),
  brandController.updateSettings,
);

/* SETUP PROGRESS */
router.patch(
  "/:id/setup",
  authenticateToken,
  authorize("Brands", "update"),
  validate(setupProgressSchema),
  brandController.updateSetup,
);

export default router;
