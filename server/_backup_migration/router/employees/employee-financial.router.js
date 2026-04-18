import express from "express";
import employeeFinancialController from "../../controllers/employees/employee-financial.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createEmployeeFinancialSchema, 
  updateEmployeeFinancialSchema, 
  paramsEmployeeFinancialSchema, 
  paramsEmployeeFinancialIdsSchema,
  queryEmployeeFinancialSchema 
} from "../../validation/employees/employee-financial.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createEmployeeFinancialSchema), employeeFinancialController.create)
  .get(authenticateToken, validate(queryEmployeeFinancialSchema), employeeFinancialController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsEmployeeFinancialSchema), employeeFinancialController.getOne)
  .put(authenticateToken, validate(updateEmployeeFinancialSchema), employeeFinancialController.update)
  .delete(authenticateToken, validate(paramsEmployeeFinancialSchema), employeeFinancialController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsEmployeeFinancialSchema), employeeFinancialController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsEmployeeFinancialSchema), employeeFinancialController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsEmployeeFinancialIdsSchema), employeeFinancialController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsEmployeeFinancialIdsSchema), employeeFinancialController.bulkSoftDelete);


export default router;
