const express = require("express");
const router = express.Router();

// Import Accounting Period Controller
const {
  createPeriod,
  getPeriods,
  getPeriodById,
  updatePeriod,
  getActivePeriod,
  closePeriod,
  reopenPeriod,
} = require("../../controllers/accounting/accounting-period.controller");

const { authenticateToken } = require("../../middlewares/authenticate");
const checkSubscription = require("../../middlewares/checkSubscription");

// ==============================
// Accounting Period Routes
// ==============================

/**
 * @route   POST /api/accounting-periods
 * @desc    Create new accounting period
 */
router
  .route("/")
  .post(authenticateToken, checkSubscription, createPeriod)
  .get(authenticateToken, checkSubscription, getPeriods);

router
  .route("/:id")
  .get(authenticateToken, checkSubscription, getPeriodById)
  .put(authenticateToken, checkSubscription, updatePeriod);

router
  .route("/active")
  .get(authenticateToken, checkSubscription, getActivePeriod);

router
  .route("/:id/close")
  .put(authenticateToken, checkSubscription, closePeriod);

router
  .route("/:id/reopen")
  .put(authenticateToken, checkSubscription, reopenPeriod);

module.exports = router;
