import express from "express";
import tableController from "../../controllers/seating/table.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createTableSchema, 
  updateTableSchema, 
  paramsTableSchema, 
  paramsTableIdsSchema,
  queryTableSchema 
} from "../../validation/seating/table.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createTableSchema), tableController.create)
  .get(authenticateToken, validate(queryTableSchema), tableController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsTableSchema), tableController.getOne)
  .put(authenticateToken, validate(updateTableSchema), tableController.update)
  .delete(authenticateToken, validate(paramsTableSchema), tableController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsTableSchema), tableController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsTableSchema), tableController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsTableIdsSchema), tableController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsTableIdsSchema), tableController.bulkSoftDelete);


export default router;
