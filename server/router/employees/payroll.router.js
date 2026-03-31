import express from "express";
import payrollController from "../../controllers/employees/payroll.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createPayrollSchema, updatePayrollSchema } from "../../validation/employees/payroll.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createPayrollSchema), payrollController.create)
  .get(authenticateToken, payrollController.getAll)
;

router.route("/:id")
  .get(authenticateToken, payrollController.getOne)
  .put(authenticateToken, validate(updatePayrollSchema), payrollController.update)
  .delete(authenticateToken, payrollController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, payrollController.restore)
;



export default router;
