import express from "express";
import userAccountController from "./user-account.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";

import {
  createUserAccountSchema,
  updateUserAccountSchema,
  paramsUserAccountSchema,
  paramsUserAccountIdsSchema,
  queryUserAccountSchema,
} from "./user-account.validation.js";

const router = express.Router();

/* =========================
   CREATE + LIST
========================= */
router
  .route("/")
  .post(
    authenticateToken,
    authorize("UserAccounts", "create"),
    validate(createUserAccountSchema),
    userAccountController.create
  )
  .get(
    authenticateToken,
    authorize("UserAccounts", "read"),
    validate(queryUserAccountSchema),
    userAccountController.getAll
  );

/* =========================
   SINGLE USER OPERATIONS
========================= */
router
  .route("/:id")
  .get(
    authenticateToken,
    authorize("UserAccounts", "read"),
    validate(paramsUserAccountSchema),
    userAccountController.getOne
  )
  .put(
    authenticateToken,
    authorize("UserAccounts", "update"),
    validate(updateUserAccountSchema),
    userAccountController.update
  )
  .delete(
    authenticateToken,
    authorize("UserAccounts", "delete"),
    validate(paramsUserAccountSchema),
    userAccountController.hardDelete
  );

/* =========================
   SOFT DELETE / RESTORE
========================= */
router.patch(
  "/soft-delete/:id",
  authenticateToken,
  authorize("UserAccounts", "delete"),
  validate(paramsUserAccountSchema),
  userAccountController.softDelete
);

router.patch(
  "/restore/:id",
  authenticateToken,
  authorize("UserAccounts", "update"),
  validate(paramsUserAccountSchema),
  userAccountController.restore
);

/* =========================
   BULK OPS
========================= */
router.delete(
  "/bulk-delete",
  authenticateToken,
  authorize("UserAccounts", "delete"),
  validate(paramsUserAccountIdsSchema),
  userAccountController.bulkHardDelete
);

router.patch(
  "/bulk-soft-delete",
  authenticateToken,
  authorize("UserAccounts", "delete"),
  validate(paramsUserAccountIdsSchema),
  userAccountController.bulkSoftDelete
);

export default router;