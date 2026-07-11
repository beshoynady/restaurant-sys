import express from "express";
import journalEntryController from "./journal-entry.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createJournalEntrySchema, 
  updateJournalEntrySchema, 
  paramsJournalEntrySchema, 
  paramsJournalEntryIdsSchema,
  queryJournalEntrySchema 
} from "./journal-entry.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("JournalEntries", "create"),
    checkModuleEnabled("accounting"), validate(createJournalEntrySchema), journalEntryController.create)
  .get(authenticateToken,
    authorize("JournalEntries", "read"),
    checkModuleEnabled("accounting"), validate(queryJournalEntrySchema), journalEntryController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("JournalEntries", "read"),
    checkModuleEnabled("accounting"), validate(paramsJournalEntrySchema), journalEntryController.getOne)
  .put(authenticateToken,
    authorize("JournalEntries", "update"),
    checkModuleEnabled("accounting"), validate(updateJournalEntrySchema), journalEntryController.update)
  .delete(authenticateToken,
    authorize("JournalEntries", "delete"),
    checkModuleEnabled("accounting"), validate(paramsJournalEntrySchema), journalEntryController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("JournalEntries", "delete"),
    checkModuleEnabled("accounting"), validate(paramsJournalEntrySchema), journalEntryController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("JournalEntries", "update"),
    checkModuleEnabled("accounting"), validate(paramsJournalEntrySchema), journalEntryController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("JournalEntries", "delete"),
    checkModuleEnabled("accounting"), validate(paramsJournalEntryIdsSchema), journalEntryController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("JournalEntries", "delete"),
    checkModuleEnabled("accounting"),validate(paramsJournalEntryIdsSchema), journalEntryController.bulkSoftDelete);


export default router;
