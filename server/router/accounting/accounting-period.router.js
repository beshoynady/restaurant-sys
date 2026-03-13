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


// ==============================
// Accounting Period Routes
// ==============================

/**
 * @route   POST /api/accounting-periods
 * @desc    Create new accounting period
 */
router
  .route("/")
  .post(authenticateToken,createPeriod)
  .get(authenticateToken,getPeriods);

router
  .route("/:id")
  .get(authenticateToken,getPeriodById)
  .put(authenticateToken,updatePeriod);

router
  .route("/active")
  .get(authenticateToken,getActivePeriod);

router
  .route("/:id/close")
  .put(authenticateToken,closePeriod);

router
  .route("/:id/reopen")
  .put(authenticateToken,reopenPeriod);

module.exports = router;
