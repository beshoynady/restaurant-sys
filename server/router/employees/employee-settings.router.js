import express from "express";
import employeeSettingsController from "../../controllers/employees/employee-settings.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createEmployeeSettingsSchema, updateEmployeeSettingsSchema } from "../../validation/employees/employee-settings.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createEmployeeSettingsSchema), employeeSettingsController.create)
  .get(authenticateToken, employeeSettingsController.getAll)
;

router.route("/:id")
  .get(authenticateToken, employeeSettingsController.getOne)
  .put(authenticateToken, validate(updateEmployeeSettingsSchema), employeeSettingsController.update)
  .delete(authenticateToken, employeeSettingsController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, employeeSettingsController.restore)
;



export default router;
