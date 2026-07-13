import express from "express";
import departmentController from "./department.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createDepartmentSchema, 
  updateDepartmentSchema, 
  paramsDepartmentSchema, 
  paramsDepartmentIdsSchema,
  queryDepartmentSchema 
} from "./department.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("Departments", "create"),
    checkModuleEnabled("hr"), validate(createDepartmentSchema), departmentController.create)
  .get(authenticateToken,
    authorize("Departments", "read"),
    checkModuleEnabled("hr"), validate(queryDepartmentSchema), departmentController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("Departments", "read"),
    checkModuleEnabled("hr"), validate(paramsDepartmentSchema, "params"), departmentController.getOne)
  .put(authenticateToken,
    authorize("Departments", "update"),
    checkModuleEnabled("hr"), validate(updateDepartmentSchema), departmentController.update)
  .delete(authenticateToken,
    authorize("Departments", "delete"),
    checkModuleEnabled("hr"), validate(paramsDepartmentSchema, "params"), departmentController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("Departments", "delete"),
    checkModuleEnabled("hr"), validate(paramsDepartmentSchema, "params"), departmentController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("Departments", "update"),
    checkModuleEnabled("hr"), validate(paramsDepartmentSchema, "params"), departmentController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Departments", "delete"),
    checkModuleEnabled("hr"), validate(paramsDepartmentIdsSchema), departmentController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("Departments", "delete"),
    checkModuleEnabled("hr"),validate(paramsDepartmentIdsSchema), departmentController.bulkSoftDelete);


export default router;
