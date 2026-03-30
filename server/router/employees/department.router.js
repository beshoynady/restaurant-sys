import express from "express";
import departmentController from "../../controllers/employees/department.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createdepartmentSchema, updatedepartmentSchema } from "../../validation/employees/department.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createdepartmentSchema), departmentController.create)
  .get(authenticateToken, departmentController.getAll)
;

router.route("/:id")
  .get(authenticateToken, departmentController.getOne)
  .put(authenticateToken, validate(updatedepartmentSchema), departmentController.update)
  .delete(authenticateToken, departmentController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, departmentController.restore)
;



export default router;
