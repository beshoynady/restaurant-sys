import express from "express";
import journalEntryController from "../../controllers/accounting/journal-entry.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createjournalEntrySchema, updatejournalEntrySchema } from "../../validation/accounting/journal-entry.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createjournalEntrySchema), journalEntryController.create)
  .get(authenticateToken, journalEntryController.getAll)
;

router.route("/:id")
  .get(authenticateToken, journalEntryController.getOne)
  .put(authenticateToken, validate(updatejournalEntrySchema), journalEntryController.update)
  .delete(authenticateToken, journalEntryController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, journalEntryController.restore)
;



export default router;
