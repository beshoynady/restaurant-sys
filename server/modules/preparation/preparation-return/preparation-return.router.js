import express from "express";
import preparationReturnController from "./kitchen/preparation-return.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPreparationReturnSchema, 
  updatePreparationReturnSchema, 
  paramsPreparationReturnSchema, 
  paramsPreparationReturnIdsSchema,
  queryPreparationReturnSchema 
} from "../../validation/kitchen/preparation-return.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPreparationReturnSchema), preparationReturnController.create)
  .get(authenticateToken, validate(queryPreparationReturnSchema), preparationReturnController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsPreparationReturnSchema), preparationReturnController.getOne)
  .put(authenticateToken, validate(updatePreparationReturnSchema), preparationReturnController.update)
  .delete(authenticateToken, validate(paramsPreparationReturnSchema), preparationReturnController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPreparationReturnSchema), preparationReturnController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPreparationReturnSchema), preparationReturnController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPreparationReturnIdsSchema), preparationReturnController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPreparationReturnIdsSchema), preparationReturnController.bulkSoftDelete);


export default router;
