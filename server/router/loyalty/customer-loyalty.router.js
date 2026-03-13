import express from "express";
const router = express.Router();

import {
  createCustomerLoyalty,
  getCustomerLoyalty,
  getallCustomerLoyalty,
  getCustomerLoyaltyByPhone,
  updateCustomerLoyalty,
  updateTierCustomerLoyalty,
  deleteCustomerLoyalty,
} from "../../controllers/loyalty/customer-loyalty.controller.js";

import {authenticateToken} from "../../middlewares/authenticate.js";

// All routes require authentication
router.use(authenticateToken);

// Create and list customers
router.route("/")
  .post(createCustomerLoyalty)
  .get(getallCustomerLoyalty);

// Get customer by phone
router.route("/phone/:phone")
  .get(getCustomerLoyaltyByPhone);

// Update tier only
router.route("/:id/tier")
  .put(updateTierCustomerLoyalty);

// CRUD by id
router.route("/:id")
  .get(getCustomerLoyalty)
  .put(updateCustomerLoyalty)
  .delete(deleteCustomerLoyalty);

export default router;