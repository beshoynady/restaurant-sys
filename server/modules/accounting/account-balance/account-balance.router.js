import express from "express";
import accountBalanceController from "./account-balance.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createAccountBalanceSchema, 
  updateAccountBalanceSchema, 
  paramsAccountBalanceSchema, 
  paramsAccountBalanceIdsSchema,
  queryAccountBalanceSchema 
} from "./account-balance.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("AccountBalances", "create"),
    checkModuleEnabled("accounting"), validate(createAccountBalanceSchema), accountBalanceController.create)
  .get(authenticateToken,
    authorize("AccountBalances", "read"),
    checkModuleEnabled("accounting"), validate(queryAccountBalanceSchema), accountBalanceController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("AccountBalances", "read"),
    checkModuleEnabled("accounting"), validate(paramsAccountBalanceSchema, "params"), accountBalanceController.getOne)
  .put(authenticateToken,
    authorize("AccountBalances", "update"),
    checkModuleEnabled("accounting"), validate(updateAccountBalanceSchema), accountBalanceController.update)
  .delete(authenticateToken,
    authorize("AccountBalances", "delete"),
    checkModuleEnabled("accounting"), validate(paramsAccountBalanceSchema, "params"), accountBalanceController.hardDelete) // soft delete
;

// PLATFORM_FINAL_AUDIT.md PA-01, corrected: soft-delete/restore/
// bulk-soft-delete removed — AccountBalance is a derived, system-computed
// snapshot with no delete semantics of its own.

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("AccountBalances", "delete"),
    checkModuleEnabled("accounting"), validate(paramsAccountBalanceIdsSchema), accountBalanceController.bulkHardDelete);


export default router;
