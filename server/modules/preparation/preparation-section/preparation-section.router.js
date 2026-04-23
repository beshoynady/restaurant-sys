import express from "express";
import preparationSectionController from "./kitchen/preparation-section.controller.js";
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
  .get(authenticateToken, validate(paramsPreparationSectionSchema), preparationSectionController.getOne)
  .put(authenticateToken, validate(updatePreparationSectionSchema), preparationSectionController.update)
  .delete(authenticateToken, validate(paramsPreparationSectionSchema), preparationSectionController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPreparationSectionSchema), preparationSectionController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPreparationSectionSchema), preparationSectionController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPreparationSectionIdsSchema), preparationSectionController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPreparationSectionIdsSchema), preparationSectionController.bulkSoftDelete);


export default router;
