// routes/core/branch-settings.routes.js

import express from "express";
import branchSettingsController from "../../controllers/core/branch-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";

import {
  createBranchSettingsSchema,
  updateBranchSettingsSchema,
  paramsBranchSettingsSchema,
  paramsBranchSettingsIdsSchema,
  queryBranchSettingsSchema,
} from "../../validation/core/branch-settings.validation.js";

const router = express.Router();

/**
 * 🔹 Inject config
 */
const branchSettingsConfig = (req, res, next) => {
  req.populate = ["brand", "branch", "createdBy", "updatedBy"];
  next();
};

// =====================================================
// 🌍 PUBLIC ROUTES (NO AUTH)
// =====================================================

router.get(
  "/public/branch/:branchId",
  branchSettingsController.getPublicSettings
);

router.get(
  "/public/branch/:branchId/is-open",
  branchSettingsController.isBranchOpen
);

router.get(
  "/public/branch/:branchId/service/:serviceType",
  branchSettingsController.isServiceAvailable
);

router.get(
  "/public/branch/:branchId/current-period",
  branchSettingsController.getCurrentPeriod
);

// =====================================================
// 🔒 PROTECTED ROUTES (ADMIN / DASHBOARD)
// =====================================================

router.route("/")
  .post(
    authenticateToken,
    authorize("branch_settings.create"),
    branchSettingsConfig,
    validate(createBranchSettingsSchema),
    branchSettingsController.create
  )
  .get(
    authenticateToken,
    authorize("branch_settings.view"),
    branchSettingsConfig,
    validate(queryBranchSettingsSchema),
    branchSettingsController.getAll
  );

router.route("/:id")
  .get(
    authenticateToken,
    authorize("branch_settings.view"),
    branchSettingsConfig,
    validate(paramsBranchSettingsSchema),
    branchSettingsController.getOne
  )
  .put(
    authenticateToken,
    authorize("branch_settings.update"),
    branchSettingsConfig,
    validate(updateBranchSettingsSchema),
    branchSettingsController.update
  )
  .delete(
    authenticateToken,
    authorize("branch_settings.delete"),
    validate(paramsBranchSettingsSchema),
    branchSettingsController.hardDelete
  );

// =====================================================
// 🔒 SOFT DELETE
// =====================================================

router.patch(
  "/soft-delete/:id",
  authenticateToken,
  authorize("branch_settings.delete"),
  validate(paramsBranchSettingsSchema),
  branchSettingsController.softDelete
);

router.patch(
  "/restore/:id",
  authenticateToken,
  authorize("branch_settings.update"),
  validate(paramsBranchSettingsSchema),
  branchSettingsController.restore
);

// =====================================================
// 🔒 BULK OPERATIONS
// =====================================================

router.delete(
  "/bulk-delete",
  authenticateToken,
  authorize("branch_settings.delete"),
  validate(paramsBranchSettingsIdsSchema),
  branchSettingsController.bulkHardDelete
);

router.patch(
  "/bulk-soft-delete",
  authenticateToken,
  authorize("branch_settings.delete"),
  validate(paramsBranchSettingsIdsSchema),
  branchSettingsController.bulkSoftDelete
);

export default router;