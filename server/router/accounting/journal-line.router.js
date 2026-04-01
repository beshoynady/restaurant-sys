import express from "express";
import journalLineController from "../../controllers/accounting/journal-line.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createJournalLineSchema, 
  updateJournalLineSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/accounting/journal-line.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createJournalLineSchema), journalLineController.create)
  .get(authenticateToken, validate(querySchema()), journalLineController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), journalLineController.getOne)
  .put(authenticateToken, validate(updateJournalLineSchema), journalLineController.update)
  .delete(authenticateToken, validate(paramsSchema()), journalLineController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), journalLineController.restore)
;

export default router;
