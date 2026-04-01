import express from "express";
import journalEntryController from "../../controllers/accounting/journal-entry.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createJournalEntrySchema, 
  updateJournalEntrySchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/accounting/journal-entry.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createJournalEntrySchema), journalEntryController.create)
  .get(authenticateToken, validate(querySchema()), journalEntryController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), journalEntryController.getOne)
  .put(authenticateToken, validate(updateJournalEntrySchema), journalEntryController.update)
  .delete(authenticateToken, validate(paramsSchema()), journalEntryController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), journalEntryController.restore)
;

export default router;
