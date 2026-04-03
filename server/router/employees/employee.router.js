import express from "express";
import employeeController from "../../controllers/employees/employee.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createEmployeeSchema, 
  updateEmployeeSchema, 
  paramsEmployeeSchema, 
  paramsEmployeeIdsSchema,
  queryEmployeeSchema 
} from "../../validation/employees/employee.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createEmployeeSchema), employeeController.create)
  .get(authenticateToken, validate(queryEmployeeSchema), employeeController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsEmployeeSchema), employeeController.getOne)
  .put(authenticateToken, validate(updateEmployeeSchema), employeeController.update)
  .delete(authenticateToken, validate(paramsEmployeeSchema), employeeController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsEmployeeSchema), employeeController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsEmployeeSchema), employeeController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsEmployeeIdsSchema), employeeController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsEmployeeIdsSchema), employeeController.bulkSoftDelete);


export default router;
