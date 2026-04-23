// routes/core/branch-settings.routes.js

import express from "express";
import branchSettingsController from "../../controllers/core/branch-settings.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
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

// =========================
// CRUD
// =========================

router.route("/")
  .post(
    authenticateToken,
    branchSettingsConfig,
    validate(createBranchSettingsSchema),
    branchSettingsController.create
  )
  .get(
    authenticateToken,
    branchSettingsConfig,
    validate(queryBranchSettingsSchema),
    branchSettingsController.getAll
  );

router.route("/:id")
  .get(
    authenticateToken,
    branchSettingsConfig,
    validate(paramsBranchSettingsSchema),
    branchSettingsController.getOne
  )
  .put(
    authenticateToken,
    branchSettingsConfig,
    validate(updateBranchSettingsSchema),
    branchSettingsController.update
  )
  .delete(
    authenticateToken,
    validate(paramsBranchSettingsSchema),
    branchSettingsController.hardDelete
  );

// =========================
// Soft Delete
// =========================

router.patch(
  "/soft-delete/:id",
  authenticateToken,
  validate(paramsBranchSettingsSchema),
  branchSettingsController.softDelete
);

router.patch(
  "/restore/:id",
  authenticateToken,
  validate(paramsBranchSettingsSchema),
  branchSettingsController.restore
);

// =========================
// Bulk
// =========================

router.delete(
  "/bulk-delete",
  authenticateToken,
  validate(paramsBranchSettingsIdsSchema),
  branchSettingsController.bulkHardDelete
);

router.patch(
  "/bulk-soft-delete",
  authenticateToken,
  validate(paramsBranchSettingsIdsSchema),
  branchSettingsController.bulkSoftDelete
);

// =========================
// Business Logic 🔥
// =========================

router.get(
  "/branch/:branchId/is-open",
  authenticateToken,
  branchSettingsController.isBranchOpen
);

router.get(
  "/branch/:branchId/service/:serviceType",
  authenticateToken,
  branchSettingsController.isServiceAvailable
);

router.get(
  "/branch/:branchId/current-period",
  authenticateToken,
  branchSettingsController.getCurrentPeriod
);

export default router;