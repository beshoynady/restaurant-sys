import express from "express";
import journalEntryController from "./journal-entry.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createJournalEntrySchema,
  createJournalEntryWithLinesSchema,
  updateJournalEntrySchema,
  paramsJournalEntrySchema,
  paramsJournalEntryIdsSchema,
  queryJournalEntrySchema,
  rejectJournalEntrySchema,
  reverseJournalEntrySchema,
} from "./journal-entry.validation.js";

const router = express.Router();

// Create & GetAll (existing behavior, unchanged)
router
  .route("/")
  .post(
    authenticateToken,
    authorize("JournalEntries", "create"),
    checkModuleEnabled("accounting"),
    validate(createJournalEntrySchema),
    journalEntryController.create,
  )
  .get(
    authenticateToken,
    authorize("JournalEntries", "read"),
    checkModuleEnabled("accounting"),
    validate(queryJournalEntrySchema),
    journalEntryController.getAll,
  );

// DB-010: transactional, balanced, period-lock-checked creation of a JournalEntry + its lines.
router
  .route("/post")
  .post(
    authenticateToken,
    authorize("JournalEntries", "create"),
    checkModuleEnabled("accounting"),
    validate(createJournalEntryWithLinesSchema),
    journalEntryController.createWithLines,
  );

// GetOne, Update, hardDelete
router
  .route("/:id")
  .get(
    authenticateToken,
    authorize("JournalEntries", "read"),
    checkModuleEnabled("accounting"),
    validate(paramsJournalEntrySchema, "params"),
    journalEntryController.getOne,
  )
  .put(
    authenticateToken,
    authorize("JournalEntries", "update"),
    checkModuleEnabled("accounting"),
    validate(updateJournalEntrySchema),
    journalEntryController.update,
  )
  .delete(
    authenticateToken,
    authorize("JournalEntries", "delete"),
    checkModuleEnabled("accounting"),
    validate(paramsJournalEntrySchema, "params"),
    journalEntryController.hardDelete,
  );

// Journal Entry Posting Engine — maker-checker approve/reject (Pending -> Posted/Rejected)
// and the reversal correction flow (Posted -> Reversed + a new offsetting entry).
router
  .route("/:id/approve")
  .patch(
    authenticateToken,
    authorize("JournalEntries", "approve"),
    checkModuleEnabled("accounting"),
    validate(paramsJournalEntrySchema, "params"),
    journalEntryController.approve,
  );

router
  .route("/:id/reject")
  .patch(
    authenticateToken,
    authorize("JournalEntries", "reject"),
    checkModuleEnabled("accounting"),
    validate(paramsJournalEntrySchema, "params"),
    validate(rejectJournalEntrySchema),
    journalEntryController.reject,
  );

router
  .route("/:id/reverse")
  .post(
    authenticateToken,
    authorize("JournalEntries", "reverse"),
    checkModuleEnabled("accounting"),
    validate(paramsJournalEntrySchema, "params"),
    validate(reverseJournalEntrySchema),
    journalEntryController.reverse,
  );

// PLATFORM_FINAL_AUDIT.md PA-01, corrected: soft-delete/restore/
// bulk-soft-delete removed — JournalEntry is a transactional financial
// document (Pending/Posted/Rejected/Reversed lifecycle), not master data;
// financial records are corrected via a reversal entry, never deleted.

// --- BULK HARD DELETE ---
router
  .route("/bulk-delete")
  .delete(
    authenticateToken,
    authorize("JournalEntries", "delete"),
    checkModuleEnabled("accounting"),
    validate(paramsJournalEntryIdsSchema),
    journalEntryController.bulkHardDelete,
  );

export default router;
