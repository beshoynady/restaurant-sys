import express from "express";
import preparationReturnController from "../../controllers/kitchen/preparation-return.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPreparationReturnSchema, 
  updatePreparationReturnSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/kitchen/preparation-return.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPreparationReturnSchema), preparationReturnController.create)
  .get(authenticateToken, validate(querySchema()), preparationReturnController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), preparationReturnController.getOne)
  .put(authenticateToken, validate(updatePreparationReturnSchema), preparationReturnController.update)
  .delete(authenticateToken, validate(paramsSchema()), preparationReturnController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), preparationReturnController.restore)
;

export default router;
