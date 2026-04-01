import express from "express";
import journalLineController from "../../controllers/accounting/journal-line.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createJournalLineSchema, updateJournalLineSchema, journalLineParamsSchema, journalLineQuerySchema } from "../../validation/accounting/journal-line.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createJournalLineSchema), journalLineController.create)
  .get(authenticateToken, validate(journalLineQuerySchema), journalLineController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(journalLineParamsSchema), journalLineController.getOne)
  .put(authenticateToken, validate(updateJournalLineSchema), journalLineController.update)
  .delete(authenticateToken, validate(journalLineParamsSchema), journalLineController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(journalLineParamsSchema), journalLineController.restore)
;

export default router;
