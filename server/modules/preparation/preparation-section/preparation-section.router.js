import express from "express";
// Cross-domain final audit finding — same broken-path defect as
// preparation-ticket.router.js (see that file's comment); fixed for the
// same reason, still unmounted.
import preparationSectionController from "./preparation-section.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createPreparationSectionSchema, 
  updatePreparationSectionSchema, 
  paramsPreparationSectionSchema, 
  paramsPreparationSectionIdsSchema,
  queryPreparationSectionSchema 
} from "./preparation-section.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPreparationSectionSchema), preparationSectionController.create)
  .get(authenticateToken, validate(queryPreparationSectionSchema), preparationSectionController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsPreparationSectionSchema, "params"), preparationSectionController.getOne)
  .put(authenticateToken, validate(updatePreparationSectionSchema), preparationSectionController.update)
  .delete(authenticateToken, validate(paramsPreparationSectionSchema, "params"), preparationSectionController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPreparationSectionSchema, "params"), preparationSectionController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPreparationSectionSchema, "params"), preparationSectionController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPreparationSectionIdsSchema), preparationSectionController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPreparationSectionIdsSchema), preparationSectionController.bulkSoftDelete);


export default router;
