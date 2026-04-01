import express from "express";
import preparationSectionController from "../../controllers/kitchen/preparation-section.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createPreparationSectionSchema, updatePreparationSectionSchema, preparationSectionParamsSchema, preparationSectionQuerySchema } from "../../validation/kitchen/preparation-section.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPreparationSectionSchema), preparationSectionController.create)
  .get(authenticateToken, validate(preparationSectionQuerySchema), preparationSectionController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(preparationSectionParamsSchema), preparationSectionController.getOne)
  .put(authenticateToken, validate(updatePreparationSectionSchema), preparationSectionController.update)
  .delete(authenticateToken, validate(preparationSectionParamsSchema), preparationSectionController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(preparationSectionParamsSchema), preparationSectionController.restore)
;

export default router;
