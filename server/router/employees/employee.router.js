const express = require("express");
const router = express.Router();

// 🧩 Controllers
const {
 createFirstEmployee,
  createEmployee,
  updateEmployee,
  loginEmployee,
  logoutEmployee,
  getOneEmployee,
  getEmployeesWithPagination,
  getEmployeesByBranch,
  softDeleteEmployee,
  restoreEmployee,
} = require("../../controllers/employees/employee.controller.js");

// 🧩 Middlewares
const {
  authenticateToken,
  refreshAccessToken,
} = require("../../middlewares/authenticate.js");

/* ----------------------------------------------------------
 *  PUBLIC ROUTES (No Authentication Required)
 * ---------------------------------------------------------- */

// 🟢 Create first employee (Super Admin) — runs only once
router.route("/create-first").post(createFirstEmployee);

// 🟢 Employee login
router.route("/login").post(loginEmployee);

// 🟢 Refresh access token (requires valid subscription)
router.route("/refresh-token").post(refreshAccessToken);

// 🟢 Logout employee
router.route("/logout").post(logoutEmployee);

/* ----------------------------------------------------------
 *  PROTECTED ROUTES (Require Token + Subscription)
 * ---------------------------------------------------------- */

// 🧩 Base route for employees
router
  .route("/")
  // Create new employee
  .post(authenticateToken, createEmployee)
  // Get all employees
  .get(authenticateToken, getEmployeesWithPagination);

// 🧩 Single employee route (by ID)
router
  .route("/:employeeId")
  // Get employee details
  .get(authenticateToken, getOneEmployee)
  // Update employee
  .put(authenticateToken, updateEmployee);

// get employees by branch with pagination
router
  .route("/branch/:branchId")
  .get(authenticateToken, getEmployeesByBranch);

// 🧩 Soft delete employee
router
  .route("/:employeeId/soft-delete")
  .put(authenticateToken, softDeleteEmployee);

// 🧩 Restore soft-deleted employee
router
  .route("/:employeeId/restore")
  .put(authenticateToken, restoreEmployee);

/* ----------------------------------------------------------
 *  EXPORT ROUTER
 * ---------------------------------------------------------- */
module.exports = router;
