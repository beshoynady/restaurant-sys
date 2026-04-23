import express from "express";
import employeeAdvanceController from "./employee-advance.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createEmployeeAdvanceSchema, 
  updateEmployeeAdvanceSchema, 
  paramsEmployeeAdvanceSchema, 
  paramsEmployeeAdvanceIdsSchema,
  queryEmployeeAdvanceSchema 
} from "./employee-advance.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createEmployeeAdvanceSchema), employeeAdvanceController.create)
  .get(authenticateToken, validate(queryEmployeeAdvanceSchema), employeeAdvanceController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsEmployeeAdvanceSchema), employeeAdvanceController.getOne)
  .put(authenticateToken, validate(updateEmployeeAdvanceSchema), employeeAdvanceController.update)
  .delete(authenticateToken, validate(paramsEmployeeAdvanceSchema), employeeAdvanceController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsEmployeeAdvanceSchema), employeeAdvanceController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsEmployeeAdvanceSchema), employeeAdvanceController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsEmployeeAdvanceIdsSchema), employeeAdvanceController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsEmployeeAdvanceIdsSchema), employeeAdvanceController.bulkSoftDelete);


export default router;
