const express = require("express");
const router = express.Router();

// Import Journal Entry Controller
const {
  createJournalEntry,
  getJournalEntries,
  getJournalEntryById,
  postJournalEntry,
  rejectJournalEntry,
} = require("../../controllers/accounting/journal-entry.controller");

const { authenticateToken } = require("../../middlewares/authenticate");
const checkSubscription = require("../../middlewares/checkSubscription");


// ==============================
// Journal Entry Routes
// ==============================

/**
 * @route   POST /api/journal-entries
 * @desc    Create new journal entry (Pending)
 */
router
  .route("/")
  .post(authenticateToken, checkSubscription, createJournalEntry)
  .get(authenticateToken, checkSubscription, getJournalEntries);

/**
 * @route   GET /api/journal-entries/:id
 * @desc    Get journal entry by ID
 */
router
  .route("/:id")
  .get(authenticateToken, checkSubscription, getJournalEntryById)

/**
 * @route   PUT /api/journal-entries/:id/post
 * @desc    Post journal entry (affects ledger)
 */
router
  .route("/:id/post")
  .put(authenticateToken, checkSubscription, postJournalEntry);

/**
 * @route   PUT /api/journal-entries/:id/reject
 * @desc    Reject journal entry
 */
router
  .route("/:id/reject")
  .put(authenticateToken, checkSubscription, rejectJournalEntry);

module.exports = router;
