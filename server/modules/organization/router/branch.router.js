// routes/core/branch.routes.js

import express from "express";
import branchController from "../../controllers/core/branch.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";

import {
  createBranchSchema,
  updateBranchSchema,
  paramsBranchSchema,
  paramsBranchIdsSchema,
  queryBranchSchema,
} from "../../validation/core/branch.validation.js";

const router = express.Router();

/**
 * 🔹 Inject dynamic config into request
 * This makes BaseController & Service more flexible
 */
const branchConfig = (req, res, next) => {
  req.uniqueFields = ["slug"];
  req.fieldsWithLang = ["name"];
  req.populate = ["brand", "createdBy", "updatedBy"];
  next();
};

// =====================================================
// 🔹 CRUD ROUTES
// =====================================================

router
  .route("/")
  /**
   * Create Branch
   */
  .post(
    authenticateToken,
    branchConfig,
    validate(createBranchSchema),
    branchController.create,
  )

  /**
   * Get All Branches
   * Supports:
   * - pagination
   * - search
   * - sorting
   */
  .get(
    authenticateToken,
    branchConfig,
    validate(queryBranchSchema),
    branchController.getAll,
  );

router
  .route("/:id")
  /**
   * Get Single Branch
   */
  .get(
    authenticateToken,
    branchConfig,
    validate(paramsBranchSchema),
    branchController.getOne,
  )

  /**
   * Update Branch
   */
  .put(
    authenticateToken,
    branchConfig,
    validate(updateBranchSchema),
    branchController.update,
  )

  /**
   * Hard Delete Branch
   */
  .delete(
    authenticateToken,
    validate(paramsBranchSchema),
    branchController.hardDelete,
  );

// =====================================================
// 🔹 SOFT DELETE
// =====================================================

router.patch(
  "/soft-delete/:id",
  authenticateToken,
  validate(paramsBranchSchema),
  branchController.softDelete,
);

router.patch(
  "/restore/:id",
  authenticateToken,
  validate(paramsBranchSchema),
  branchController.restore,
);

// =====================================================
// 🔹 BULK OPERATIONS
// =====================================================

router.delete(
  "/bulk-delete",
  authenticateToken,
  validate(paramsBranchIdsSchema),
  branchController.bulkHardDelete,
);

router.patch(
  "/bulk-soft-delete",
  authenticateToken,
  validate(paramsBranchIdsSchema),
  branchController.bulkSoftDelete,
);

// =====================================================
// 🔹 CUSTOM ROUTES
// =====================================================

/**
 * Set Main Branch
 */
router.patch(
  "/set-main/:id",
  authenticateToken,
  validate(paramsBranchSchema),
  branchController.setMainBranch,
);

export default router;
