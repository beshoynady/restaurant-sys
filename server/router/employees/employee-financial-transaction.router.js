import express from "express";
import employeeFinancialTransactionController from "../../controllers/employees/employee-financial-transaction.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createemployeeFinancialTransactionSchema, updateemployeeFinancialTransactionSchema } from "../../validation/employees/employee-financial-transaction.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createemployeeFinancialTransactionSchema), employeeFinancialTransactionController.create)
  .get(authenticateToken, employeeFinancialTransactionController.getAll)
;

router.route("/:id")
  .get(authenticateToken, employeeFinancialTransactionController.getOne)
  .put(authenticateToken, validate(updateemployeeFinancialTransactionSchema), employeeFinancialTransactionController.update)
  .delete(authenticateToken, employeeFinancialTransactionController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, employeeFinancialTransactionController.restore)
;



export default router;
