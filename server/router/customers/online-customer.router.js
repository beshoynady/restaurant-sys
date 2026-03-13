import express from "express";
const router = express.Router();

/**
 * Controllers
 * Handles all business logic related to online customers authentication and management.
 */
import {
  createOnlineCustomer,
  loginCustomer,
  logoutCustomer,
  getOnlineCustomerById,
  getAllOnlineCustomers,
  updateOnlineCustomer,
  deleteOnlineCustomer,
  resetPassword,
} from "../../controllers/customers/online-customer.controller.js";

/**
 * Middlewares
 * - authenticateCustomerToken: Validates the access token for protected routes.
 */
import {
  authenticateCustomerToken,
  generateNewCustomerAccessToken,
} from "../../middlewares/authenticate-customer.js";

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

export default router;
