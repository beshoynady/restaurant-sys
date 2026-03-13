const express = require("express");
const {
createEmployeeFinancialTransaction,
  getAllEmployeeFinancialTransactions,
  getOneEmployeeFinancialTransaction,
  updateEmployeeFinancialTransaction,
  approveEmployeeFinancialTransaction,
  cancelEmployeeFinancialTransaction,
  getTransactionsPaginated,
  deleteEmployeeFinancialTransaction,
} = require("../../controllers/employees/employee-financial-transaction.controller.js");
const { authenticateToken } = require("../../middlewares/authenticate.js");
const checkSubscription = require("../../middlewares/checkSubscription.js");

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
module.exports = router;
