import express from "express";
import journalLineController from "./journal-line.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createJournalLineSchema, 
  updateJournalLineSchema, 
  paramsJournalLineSchema, 
  paramsJournalLineIdsSchema,
  queryJournalLineSchema 
} from "./journal-line.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createJournalLineSchema), journalLineController.create)
  .get(authenticateToken, validate(queryJournalLineSchema), journalLineController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsJournalLineSchema), journalLineController.getOne)
  .put(authenticateToken, validate(updateJournalLineSchema), journalLineController.update)
  .delete(authenticateToken, validate(paramsJournalLineSchema), journalLineController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsJournalLineSchema), journalLineController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsJournalLineSchema), journalLineController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsJournalLineIdsSchema), journalLineController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsJournalLineIdsSchema), journalLineController.bulkSoftDelete);


export default router;
