import express from "express";
import cashTransactionController from "./cash-transaction.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createCashTransactionSchema, 
  updateCashTransactionSchema, 
  paramsCashTransactionSchema, 
  paramsCashTransactionIdsSchema,
  queryCashTransactionSchema 
} from "../../validation/cash/cash-transaction.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createCashTransactionSchema), cashTransactionController.create)
  .get(authenticateToken, validate(queryCashTransactionSchema), cashTransactionController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsCashTransactionSchema), cashTransactionController.getOne)
  .put(authenticateToken, validate(updateCashTransactionSchema), cashTransactionController.update)
  .delete(authenticateToken, validate(paramsCashTransactionSchema), cashTransactionController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsCashTransactionSchema), cashTransactionController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsCashTransactionSchema), cashTransactionController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsCashTransactionIdsSchema), cashTransactionController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsCashTransactionIdsSchema), cashTransactionController.bulkSoftDelete);


export default router;
