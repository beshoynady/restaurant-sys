const express = require("express");
const router = express.Router();

/**
 * Controllers
 * Handles all business logic related to online customers authentication and management.
 */
const {
  createOnlineCustomer,
  loginCustomer,
  logoutCustomer,
  getOnlineCustomerById,
  getAllOnlineCustomers,
  updateOnlineCustomer,
  deleteOnlineCustomer,
  resetPassword,
} = require("../../controllers/customers/online-customer.controller");

/**
 * Middlewares
 * - authenticateCustomerToken: Validates the access token for protected routes.
 */
const {
  authenticateCustomerToken,
  generateNewCustomerAccessToken,
} = require("../../middlewares/authenticate-customer");

// ======================================================
// 🔐 AUTHENTICATION ROUTES
// ======================================================

router
  .route("/")
  .post(createOnlineCustomer)
  .get(authenticateCustomerToken, getAllOnlineCustomers);

router
  .route("/:id")
  .get(authenticateCustomerToken, getOnlineCustomerById)
  .put(authenticateCustomerToken, updateOnlineCustomer)
  .delete(authenticateCustomerToken, deleteOnlineCustomer);

router.route("/login").post(loginCustomer);

router.route("/logout").post(authenticateCustomerToken, logoutCustomer);

router.route("/reset-password").post(resetPassword);
router.route("/refresh-token").post(generateNewCustomerAccessToken);

module.exports = router;
