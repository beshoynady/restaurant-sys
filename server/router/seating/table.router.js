import express from "express";
import tableController from "../../controllers/seating/table.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createTableSchema, updateTableSchema, tableParamsSchema, tableQuerySchema } from "../../validation/seating/table.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createTableSchema), tableController.create)
  .get(authenticateToken, validate(tableQuerySchema), tableController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(tableParamsSchema), tableController.getOne)
  .put(authenticateToken, validate(updateTableSchema), tableController.update)
  .delete(authenticateToken, validate(tableParamsSchema), tableController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(tableParamsSchema), tableController.restore)
;

export default router;
