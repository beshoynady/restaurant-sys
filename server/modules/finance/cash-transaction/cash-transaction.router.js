import express from "express";
import cashTransactionController from "./cash-transaction.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createCashTransactionSchema, 
  updateCashTransactionSchema, 
  paramsCashTransactionSchema, 
  paramsCashTransactionIdsSchema,
  queryCashTransactionSchema 
} from "./cash-transaction.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("CashTransactions", "create"),
    checkModuleEnabled("financial"), validate(createCashTransactionSchema), cashTransactionController.create)
  .get(authenticateToken,
    authorize("CashTransactions", "read"),
    checkModuleEnabled("financial"), validate(queryCashTransactionSchema), cashTransactionController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("CashTransactions", "read"),
    checkModuleEnabled("financial"), validate(paramsCashTransactionSchema, "params"), cashTransactionController.getOne)
  .put(authenticateToken,
    authorize("CashTransactions", "update"),
    checkModuleEnabled("financial"), validate(updateCashTransactionSchema), cashTransactionController.update)
  .delete(authenticateToken,
    authorize("CashTransactions", "delete"),
    checkModuleEnabled("financial"), validate(paramsCashTransactionSchema, "params"), cashTransactionController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("CashTransactions", "delete"),
    checkModuleEnabled("financial"), validate(paramsCashTransactionSchema, "params"), cashTransactionController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("CashTransactions", "update"),
    checkModuleEnabled("financial"), validate(paramsCashTransactionSchema, "params"), cashTransactionController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("CashTransactions", "delete"),
    checkModuleEnabled("financial"), validate(paramsCashTransactionIdsSchema), cashTransactionController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("CashTransactions", "delete"),
    checkModuleEnabled("financial"),validate(paramsCashTransactionIdsSchema), cashTransactionController.bulkSoftDelete);


export default router;
