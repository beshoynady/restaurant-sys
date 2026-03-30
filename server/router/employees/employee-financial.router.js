import express from "express";
import employeeFinancialController from "../../controllers/employees/employee-financial.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createemployeeFinancialSchema, updateemployeeFinancialSchema } from "../../validation/employees/employee-financial.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createemployeeFinancialSchema), employeeFinancialController.create)
  .get(authenticateToken, employeeFinancialController.getAll)
;

router.route("/:id")
  .get(authenticateToken, employeeFinancialController.getOne)
  .put(authenticateToken, validate(updateemployeeFinancialSchema), employeeFinancialController.update)
  .delete(authenticateToken, employeeFinancialController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, employeeFinancialController.restore)
;



export default router;
