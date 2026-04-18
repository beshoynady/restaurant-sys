import express from "express";
import {
  createEmployeeFinancialTransaction,
  getAllEmployeeFinancialTransactions,
  getOneEmployeeFinancialTransaction,
  updateEmployeeFinancialTransaction,
  approveEmployeeFinancialTransaction,
  cancelEmployeeFinancialTransaction,
  getTransactionsPaginated,
  deleteEmployeeFinancialTransaction,
} from "../../controllers/employees/employee-financial-transaction.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import {
  createEmployeeFinancialTransactionSchema,
  updateEmployeeFinancialTransactionSchema,
  paramsEmployeeFinancialTransactionSchema,
  queryEmployeeFinancialTransactionSchema,
} from "../../validation/employees/employee-financial-transaction.validation.js";


const router = express.Router();

router
  .route("/")
  .post(authenticateToken, validate(createEmployeeFinancialTransactionSchema), createEmployeeFinancialTransaction)
  .get(authenticateToken, validate(queryEmployeeFinancialTransactionSchema), getAllEmployeeFinancialTransactions);
router
  .route("/:employeetransactionsId")
  .get(authenticateToken, validate(paramsEmployeeFinancialTransactionSchema), getOneEmployeeFinancialTransaction)
  .put(authenticateToken, validate(updateEmployeeFinancialTransactionSchema), updateEmployeeFinancialTransaction)
  .delete(authenticateToken, deleteEmployeeFinancialTransaction);
router
  .route("/approve/:employeetransactionsId")
  .put(authenticateToken, validate(paramsEmployeeFinancialTransactionSchema), approveEmployeeFinancialTransaction);
router
  .route("/cancel/:employeetransactionsId")
  .put(authenticateToken, validate(paramsEmployeeFinancialTransactionSchema), cancelEmployeeFinancialTransaction);
router.route("/paginated").get(authenticateToken, validate(queryEmployeeFinancialTransactionSchema), getTransactionsPaginated);

export default router;
