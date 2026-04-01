import express from "express";
import shiftController from "../../controllers/employees/shift.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createShiftSchema, updateShiftSchema, shiftParamsSchema, shiftQuerySchema } from "../../validation/employees/shift.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createShiftSchema), shiftController.create)
  .get(authenticateToken, validate(shiftQuerySchema), shiftController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(shiftParamsSchema), shiftController.getOne)
  .put(authenticateToken, validate(updateShiftSchema), shiftController.update)
  .delete(authenticateToken, validate(shiftParamsSchema), shiftController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(shiftParamsSchema), shiftController.restore)
;

export default router;
