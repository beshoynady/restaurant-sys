import express from "express";
import accountBalanceController from "./account-balance.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createAccountBalanceSchema, 
  updateAccountBalanceSchema, 
  paramsAccountBalanceSchema, 
  paramsAccountBalanceIdsSchema,
  queryAccountBalanceSchema 
} from "../../validation/accounting/account-balance.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAccountBalanceSchema), accountBalanceController.create)
  .get(authenticateToken, validate(queryAccountBalanceSchema), accountBalanceController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsAccountBalanceSchema), accountBalanceController.getOne)
  .put(authenticateToken, validate(updateAccountBalanceSchema), accountBalanceController.update)
  .delete(authenticateToken, validate(paramsAccountBalanceSchema), accountBalanceController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsAccountBalanceSchema), accountBalanceController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsAccountBalanceSchema), accountBalanceController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsAccountBalanceIdsSchema), accountBalanceController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsAccountBalanceIdsSchema), accountBalanceController.bulkSoftDelete);


export default router;
