import express from "express";
import tableController from "./table.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createTableSchema, 
  updateTableSchema, 
  paramsTableSchema, 
  paramsTableIdsSchema,
  queryTableSchema 
} from "./table.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("Tables", "create"),
    checkModuleEnabled("seating"), validate(createTableSchema), tableController.create)
  .get(authenticateToken,
    authorize("Tables", "read"),
    checkModuleEnabled("seating"), validate(queryTableSchema), tableController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("Tables", "read"),
    checkModuleEnabled("seating"), validate(paramsTableSchema, "params"), tableController.getOne)
  .put(authenticateToken,
    authorize("Tables", "update"),
    checkModuleEnabled("seating"), validate(updateTableSchema), tableController.update)
  .delete(authenticateToken,
    authorize("Tables", "delete"),
    checkModuleEnabled("seating"), validate(paramsTableSchema, "params"), tableController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("Tables", "delete"),
    checkModuleEnabled("seating"), validate(paramsTableSchema, "params"), tableController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("Tables", "update"),
    checkModuleEnabled("seating"), validate(paramsTableSchema, "params"), tableController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Tables", "delete"),
    checkModuleEnabled("seating"), validate(paramsTableIdsSchema), tableController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("Tables", "delete"),
    checkModuleEnabled("seating"),validate(paramsTableIdsSchema), tableController.bulkSoftDelete);


export default router;
