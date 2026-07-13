import express from "express";
import journalLineController from "./journal-line.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
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
  .post(authenticateToken,
    authorize("JournalLines", "create"),
    checkModuleEnabled("accounting"), validate(createJournalLineSchema), journalLineController.create)
  .get(authenticateToken,
    authorize("JournalLines", "read"),
    checkModuleEnabled("accounting"), validate(queryJournalLineSchema), journalLineController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("JournalLines", "read"),
    checkModuleEnabled("accounting"), validate(paramsJournalLineSchema, "params"), journalLineController.getOne)
  .put(authenticateToken,
    authorize("JournalLines", "update"),
    checkModuleEnabled("accounting"), validate(updateJournalLineSchema), journalLineController.update)
  .delete(authenticateToken,
    authorize("JournalLines", "delete"),
    checkModuleEnabled("accounting"), validate(paramsJournalLineSchema, "params"), journalLineController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("JournalLines", "delete"),
    checkModuleEnabled("accounting"), validate(paramsJournalLineSchema, "params"), journalLineController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("JournalLines", "update"),
    checkModuleEnabled("accounting"), validate(paramsJournalLineSchema, "params"), journalLineController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("JournalLines", "delete"),
    checkModuleEnabled("accounting"), validate(paramsJournalLineIdsSchema), journalLineController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("JournalLines", "delete"),
    checkModuleEnabled("accounting"),validate(paramsJournalLineIdsSchema), journalLineController.bulkSoftDelete);


export default router;
