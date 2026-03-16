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


const router = express.Router();

router
  .route("/")
  .post(authenticateToken,createEmployeeFinancialTransaction)
  .get(authenticateToken,getAllEmployeeFinancialTransactions);
router
  .route("/:employeetransactionsId")
  .get(authenticateToken,getOneEmployeeFinancialTransaction)
  .put(authenticateToken,updateEmployeeFinancialTransaction)
  .delete(authenticateToken,deleteEmployeeFinancialTransaction);
router
  .route("/approve/:employeetransactionsId")
  .put(authenticateToken,approveEmployeeFinancialTransaction);
router
  .route("/cancel/:employeetransactionsId")
  .put(authenticateToken,cancelEmployeeFinancialTransaction);
router
  .route("/paginated")
  .get(authenticateToken,getTransactionsPaginated);
  
export default router;
