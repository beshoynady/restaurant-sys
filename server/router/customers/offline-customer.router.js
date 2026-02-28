const express = require("express");
const router = express.Router();

// ----------------------------
// 🔹 Controllers
// ----------------------------
const {
  createOfflineCustomer,
  getAllOfflineCustomers,
  getDeletedOfflineCustomers,
  getOfflineCustomerById,
  updateOfflineCustomer,
  deleteOfflineCustomer,
  softDeleteOfflineCustomer,
  restoreOfflineCustomer,
  getOfflineCustomerByPhone,
  getOfflineCustomersByBranch,
  getDeletedOfflineCustomersByBranch,
} = require("../../controllers/customers/offline-customer.controller");

// ----------------------------
// 🔹 Middlewares
// ----------------------------
const { authenticateToken } = require("../middlewares/authenticate");
const { verifyBrandAndBranch } = require("../middlewares/verifyBrandAndBranch");

// ===================================================================
// 🔹 Base Routes (/offline-customers)
// ===================================================================

// Create a new offline customer
// Get all offline customers (with pagination & optional filters)
router
  .route("/")
  .post(
    authenticateToken,
    verifyBrandAndBranch,
    createOfflineCustomer
  )
  .get(
    authenticateToken,
    verifyBrandAndBranch,
    getAllOfflineCustomers
  );

// ===================================================================
// 🔹 Soft Deleted Customers
// ===================================================================

// Get all soft-deleted offline customers
router
  .route("/getsoftdeleted")
  .get(
    authenticateToken,
    verifyBrandAndBranch,
    getDeletedOfflineCustomers
  );

// Restore a soft-deleted customer by ID
router
  .route("/restore/:id")
  .put(
    authenticateToken,
    verifyBrandAndBranch,
    restoreOfflineCustomer
  );

// ===================================================================
// 🔹 Customer By ID
// ===================================================================

// Get customer by ID
// Update customer by ID
// Soft delete customer by ID
router
  .route("/:id")
  .get(
    authenticateToken,
    verifyBrandAndBranch,
    getOfflineCustomerById
  )
  .put(
    authenticateToken,
    verifyBrandAndBranch,
    updateOfflineCustomer
  )
  .delete(
    authenticateToken,
    verifyBrandAndBranch,
    softDeleteOfflineCustomer
  );

// ===================================================================
// 🔹 Permanent Delete (Admin Only)
// ===================================================================

// Permanently delete a customer (hard delete)
// ⚠️ Should be protected by role-based access control (Admin only)
router
  .route("/delete/branch/:branchId")
  .get(
    authenticateToken,
    verifyBrandAndBranch,
    deleteOfflineCustomer
  );

// ===================================================================
// 🔹 Search & Filters
// ===================================================================

// Get customer by phone number (supports "starts with" search)
router
  .route("/getbyphone/:phone")
  .get(
    authenticateToken,
    verifyBrandAndBranch,
    getOfflineCustomerByPhone
  );

// Get all customers for a specific branch
router
  .route("/getall/branch/:branchId")
  .get(
    authenticateToken,
    verifyBrandAndBranch,
    getOfflineCustomersByBranch
  );

// Get all soft-deleted customers for a specific branch
router
  .route("/getsoftdeleted/branch/:branchId")
  .get(
    authenticateToken,
    verifyBrandAndBranch,
    getDeletedOfflineCustomersByBranch
  );

// ===================================================================
// 🔹 Export Router
// ===================================================================
module.exports = router;
