import express from "express";
import employeeFinancialTransactionController from "./employee-financial-transaction.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createEmployeeFinancialTransactionSchema, 
  updateEmployeeFinancialTransactionSchema, 
  paramsEmployeeFinancialTransactionSchema, 
  paramsEmployeeFinancialTransactionIdsSchema,
  queryEmployeeFinancialTransactionSchema 
} from "../../validation/employees/employee-financial-transaction.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createEmployeeFinancialTransactionSchema), employeeFinancialTransactionController.create)
  .get(authenticateToken, validate(queryEmployeeFinancialTransactionSchema), employeeFinancialTransactionController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsEmployeeFinancialTransactionSchema), employeeFinancialTransactionController.getOne)
  .put(authenticateToken, validate(updateEmployeeFinancialTransactionSchema), employeeFinancialTransactionController.update)
  .delete(authenticateToken, validate(paramsEmployeeFinancialTransactionSchema), employeeFinancialTransactionController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsEmployeeFinancialTransactionSchema), employeeFinancialTransactionController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsEmployeeFinancialTransactionSchema), employeeFinancialTransactionController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsEmployeeFinancialTransactionIdsSchema), employeeFinancialTransactionController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsEmployeeFinancialTransactionIdsSchema), employeeFinancialTransactionController.bulkSoftDelete);


export default router;
