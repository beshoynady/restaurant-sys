import express from "express";
import branchController from "./branch.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";

import {
  createBranchSchema,
  updateBranchSchema,
  paramsBranchSchema,
  paramsBranchIdsSchema,
  queryBranchSchema,
} from "./branch.validation.js";

const router = express.Router();

/* =========================
   CREATE + LIST
========================= */
router.route("/")
  .post(
    authenticateToken,
    authorize("branch.create"),
    validate(createBranchSchema),
    branchController.create
  )
  .get(
    authenticateToken,
    authorize("branch.read"),
    validate(queryBranchSchema, "query"),
    branchController.getAllBranches
  );

/* =========================
   SINGLE
========================= */
router.route("/:id")
  .get(
    authenticateToken,
    authorize("branch.read"),
    validate(paramsBranchSchema, "params"),
    branchController.getOne
  )
  .put(
    authenticateToken,
    authorize("branch.update"),
    validate(updateBranchSchema),
    branchController.update
  )
  .delete(
    authenticateToken,
    authorize("branch.delete"),
    validate(paramsBranchSchema, "params"),
    branchController.hardDelete
  );

/* =========================
   SOFT DELETE
========================= */
router.patch(
  "/soft-delete/:id",
  authenticateToken,
  authorize("branch.delete"),
  validate(paramsBranchSchema, "params"),
  branchController.softDelete
);

router.patch(
  "/restore/:id",
  authenticateToken,
  authorize("branch.restore"),
  validate(paramsBranchSchema, "params"),
  branchController.restore
);

/* =========================
   BULK
========================= */
router.delete(
  "/bulk-delete",
  authenticateToken,
  authorize("branch.delete"),
  validate(paramsBranchIdsSchema),
  branchController.bulkHardDelete
);

router.patch(
  "/bulk-soft-delete",
  authenticateToken,
  authorize("branch.delete"),
  validate(paramsBranchIdsSchema),
  branchController.bulkSoftDelete
);

/* =========================
   CUSTOM
========================= */
router.patch(
  "/set-main/:id",
  authenticateToken,
  authorize("branch.update"),
  validate(paramsBranchSchema, "params"),
  branchController.setMainBranch
);

export default router;