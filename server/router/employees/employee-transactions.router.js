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
} = require("../../controllers/employee-transactions.controller.js");
const { authenticateToken } = require("../../middlewares/authenticate.js");
const checkSubscription = require("../../middlewares/checkSubscription.js");

const router = express.Router();

router
  .route("/")
  .post(authenticateToken, checkSubscription, createEmployeeFinancialTransaction)
  .get(authenticateToken, checkSubscription, getAllEmployeeFinancialTransactions);
router
  .route("/:employeetransactionsId")
  .get(authenticateToken, checkSubscription, getOneEmployeeFinancialTransaction)
  .put(authenticateToken, checkSubscription, updateEmployeeFinancialTransaction)
  .delete(authenticateToken, checkSubscription, deleteEmployeeFinancialTransaction);
router
  .route("/approve/:employeetransactionsId")
  .put(authenticateToken, checkSubscription, approveEmployeeFinancialTransaction);
router
  .route("/cancel/:employeetransactionsId")
  .put(authenticateToken, checkSubscription, cancelEmployeeFinancialTransaction);
router
  .route("/paginated")
  .get(authenticateToken, checkSubscription, getTransactionsPaginated);
module.exports = router;
