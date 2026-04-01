import express from "express";
import departmentController from "../../controllers/employees/department.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createDepartmentSchema, updateDepartmentSchema, departmentParamsSchema, departmentQuerySchema } from "../../validation/employees/department.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createDepartmentSchema), departmentController.create)
  .get(authenticateToken, validate(departmentQuerySchema), departmentController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(departmentParamsSchema), departmentController.getOne)
  .put(authenticateToken, validate(updateDepartmentSchema), departmentController.update)
  .delete(authenticateToken, validate(departmentParamsSchema), departmentController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(departmentParamsSchema), departmentController.restore)
;

export default router;
