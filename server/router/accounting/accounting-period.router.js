import express from "express";
const router = express.Router();

// Import Accounting Period Controller
import {
  createPeriod,
  getPeriods,
  getPeriodById,
  updatePeriod,
  getActivePeriod,
  closePeriod,
  reopenPeriod,
} from "../../controllers/accounting/accounting-period.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";


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

export default router;
