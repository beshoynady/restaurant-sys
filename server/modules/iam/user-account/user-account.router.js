import express from "express";
import userAccountController from "./user-account.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createUserAccountSchema, 
  updateUserAccountSchema, 
  paramsUserAccountSchema, 
  paramsUserAccountIdsSchema,
  queryUserAccountSchema 
} from "../../validation/employees/user-account.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createUserAccountSchema), userAccountController.create)
  .get(authenticateToken, validate(queryUserAccountSchema), userAccountController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsUserAccountSchema), userAccountController.getOne)
  .put(authenticateToken, validate(updateUserAccountSchema), userAccountController.update)
  .delete(authenticateToken, validate(paramsUserAccountSchema), userAccountController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsUserAccountSchema), userAccountController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsUserAccountSchema), userAccountController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsUserAccountIdsSchema), userAccountController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsUserAccountIdsSchema), userAccountController.bulkSoftDelete);


export default router;
