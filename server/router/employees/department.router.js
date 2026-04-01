import express from "express";
import departmentController from "../../controllers/employees/department.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createDepartmentSchema, 
  updateDepartmentSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/employees/department.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createDepartmentSchema), departmentController.create)
  .get(authenticateToken, validate(querySchema()), departmentController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), departmentController.getOne)
  .put(authenticateToken, validate(updateDepartmentSchema), departmentController.update)
  .delete(authenticateToken, validate(paramsSchema()), departmentController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), departmentController.restore)
;

export default router;
