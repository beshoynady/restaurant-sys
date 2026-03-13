const express = require("express");
const router = express.Router();

const {
  createCustomerLoyalty,
  getCustomerLoyalty,
  getallCustomerLoyalty,
  getCustomerLoyaltyByPhone,
  updateCustomerLoyalty,
  updateTierCustomerLoyalty,
  deleteCustomerLoyalty,
} = require("../../controllers/loyalty/customer-loyalty.controller");

const { authenticate } = require("../../middleware/auth.middleware");

// All routes require authentication
router.use(authenticate);

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

module.exports = router;