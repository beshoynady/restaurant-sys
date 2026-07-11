import express from "express";
import warehouseController from "./warehouse.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createWarehouseSchema, 
  updateWarehouseSchema, 
  paramsWarehouseSchema, 
  paramsWarehouseIdsSchema,
  queryWarehouseSchema 
} from "./warehouse.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("Warehouses", "create"),
    checkModuleEnabled("inventory"), validate(createWarehouseSchema), warehouseController.create)
  .get(authenticateToken,
    authorize("Warehouses", "read"),
    checkModuleEnabled("inventory"), validate(queryWarehouseSchema), warehouseController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("Warehouses", "read"),
    checkModuleEnabled("inventory"), validate(paramsWarehouseSchema), warehouseController.getOne)
  .put(authenticateToken,
    authorize("Warehouses", "update"),
    checkModuleEnabled("inventory"), validate(updateWarehouseSchema), warehouseController.update)
  .delete(authenticateToken,
    authorize("Warehouses", "delete"),
    checkModuleEnabled("inventory"), validate(paramsWarehouseSchema), warehouseController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("Warehouses", "delete"),
    checkModuleEnabled("inventory"), validate(paramsWarehouseSchema), warehouseController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("Warehouses", "update"),
    checkModuleEnabled("inventory"), validate(paramsWarehouseSchema), warehouseController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Warehouses", "delete"),
    checkModuleEnabled("inventory"), validate(paramsWarehouseIdsSchema), warehouseController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("Warehouses", "delete"),
    checkModuleEnabled("inventory"),validate(paramsWarehouseIdsSchema), warehouseController.bulkSoftDelete);


export default router;
