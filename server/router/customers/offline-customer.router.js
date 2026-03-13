import express from "express";
const router = express.Router();

// ----------------------------
// 🔹 Controllers
// ----------------------------
import {
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
} from "../../controllers/customers/offline-customer.controller.js";

// ----------------------------
// 🔹 Middlewares
// ----------------------------
import { authenticateToken } from "../../middlewares/authenticate.js";


// ===================================================================
// 🔹 Base Routes (/offline-customers)
// ===================================================================

// Create a new offline customer
// Get all offline customers (with pagination & optional filters)
router
  .route("/")
  .post(
    authenticateToken,
    
    createOfflineCustomer
  )
  .get(
    authenticateToken,
    
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
    
    getDeletedOfflineCustomers
  );

// Restore a soft-deleted customer by ID
router
  .route("/restore/:id")
  .put(
    authenticateToken,
    
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
    
    getOfflineCustomerById
  )
  .put(
    authenticateToken,
    
    updateOfflineCustomer
  )
  .delete(
    authenticateToken,
    
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
    
    getOfflineCustomerByPhone
  );

// Get all customers for a specific branch
router
  .route("/getall/branch/:branchId")
  .get(
    authenticateToken,
    
    getOfflineCustomersByBranch
  );

// Get all soft-deleted customers for a specific branch
router
  .route("/getsoftdeleted/branch/:branchId")
  .get(
    authenticateToken,
    
    getDeletedOfflineCustomersByBranch
  );

// ===================================================================
// 🔹 export  Router
// ===================================================================
export default router;
