import express from "express";
import journalLineController from "../../controllers/accounting/journal-line.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createJournalLineSchema, updateJournalLineSchema } from "../../validation/accounting/journal-line.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createJournalLineSchema), journalLineController.create)
  .get(authenticateToken, journalLineController.getAll)
;

router.route("/:id")
  .get(authenticateToken, journalLineController.getOne)
  .put(authenticateToken, validate(updateJournalLineSchema), journalLineController.update)
  .delete(authenticateToken, journalLineController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, journalLineController.restore)
;



export default router;
