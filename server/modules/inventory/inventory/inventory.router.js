import express from "express";
import inventoryController from "./inventory.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createInventorySchema, 
  updateInventorySchema, 
  paramsInventorySchema, 
  paramsInventoryIdsSchema,
  queryInventorySchema 
} from "./inventory.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("Inventory", "create"),
    checkModuleEnabled("inventory"), validate(createInventorySchema), inventoryController.create)
  .get(authenticateToken,
    authorize("Inventory", "read"),
    checkModuleEnabled("inventory"), validate(queryInventorySchema), inventoryController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("Inventory", "read"),
    checkModuleEnabled("inventory"), validate(paramsInventorySchema), inventoryController.getOne)
  .put(authenticateToken,
    authorize("Inventory", "update"),
    checkModuleEnabled("inventory"), validate(updateInventorySchema), inventoryController.update)
  .delete(authenticateToken,
    authorize("Inventory", "delete"),
    checkModuleEnabled("inventory"), validate(paramsInventorySchema), inventoryController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("Inventory", "delete"),
    checkModuleEnabled("inventory"), validate(paramsInventorySchema), inventoryController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("Inventory", "update"),
    checkModuleEnabled("inventory"), validate(paramsInventorySchema), inventoryController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Inventory", "delete"),
    checkModuleEnabled("inventory"), validate(paramsInventoryIdsSchema), inventoryController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("Inventory", "delete"),
    checkModuleEnabled("inventory"),validate(paramsInventoryIdsSchema), inventoryController.bulkSoftDelete);


export default router;
