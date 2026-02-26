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
 * - verifyBrand: Ensures the request is scoped to a valid brand.
 * - authenticateCustomerToken: Validates the access token for protected routes.
 */
const { verifyBrand } = require("../../middlewares/verifyBrand");
const {
  authenticateCustomerToken,
  generateNewCustomerAccessToken,
} = require("../../middlewares/authenticateCustomer");

// ======================================================
// 🔐 AUTHENTICATION ROUTES
// ======================================================

router
  .route("/")
  .post(verifyBrand, createOnlineCustomer)
  .get(authenticateCustomerToken, verifyBrand, getAllOnlineCustomers);

router
  .route("/:id")
  .get(authenticateCustomerToken, verifyBrand, getOnlineCustomerById)
  .put(authenticateCustomerToken, verifyBrand, updateOnlineCustomer)
  .delete(authenticateCustomerToken, verifyBrand, deleteOnlineCustomer);

router.route("/login").post(verifyBrand, loginCustomer);

router.route("/logout").post(authenticateCustomerToken, verifyBrand, logoutCustomer);

router.route("/reset-password").post(verifyBrand, resetPassword);
router.route("/refresh-token").post(verifyBrand, generateNewCustomerAccessToken);

module.exports = router;
