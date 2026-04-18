import express from "express";
import departmentController from "../../controllers/employees/department.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createDepartmentSchema, 
  updateDepartmentSchema, 
  paramsDepartmentSchema, 
  paramsDepartmentIdsSchema,
  queryDepartmentSchema 
} from "../../validation/employees/department.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createDepartmentSchema), departmentController.create)
  .get(authenticateToken, validate(queryDepartmentSchema), departmentController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsDepartmentSchema), departmentController.getOne)
  .put(authenticateToken, validate(updateDepartmentSchema), departmentController.update)
  .delete(authenticateToken, validate(paramsDepartmentSchema), departmentController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsDepartmentSchema), departmentController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsDepartmentSchema), departmentController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsDepartmentIdsSchema), departmentController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsDepartmentIdsSchema), departmentController.bulkSoftDelete);


export default router;
