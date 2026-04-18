import express from "express";
import journalEntryController from "../../controllers/accounting/journal-entry.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createJournalEntrySchema, 
  updateJournalEntrySchema, 
  paramsJournalEntrySchema, 
  paramsJournalEntryIdsSchema,
  queryJournalEntrySchema 
} from "../../validation/accounting/journal-entry.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createJournalEntrySchema), journalEntryController.create)
  .get(authenticateToken, validate(queryJournalEntrySchema), journalEntryController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsJournalEntrySchema), journalEntryController.getOne)
  .put(authenticateToken, validate(updateJournalEntrySchema), journalEntryController.update)
  .delete(authenticateToken, validate(paramsJournalEntrySchema), journalEntryController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsJournalEntrySchema), journalEntryController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsJournalEntrySchema), journalEntryController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsJournalEntryIdsSchema), journalEntryController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsJournalEntryIdsSchema), journalEntryController.bulkSoftDelete);


export default router;
