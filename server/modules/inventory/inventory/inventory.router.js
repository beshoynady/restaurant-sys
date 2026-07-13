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
    checkModuleEnabled("inventory"), validate(paramsInventorySchema, "params"), inventoryController.getOne)
  .put(authenticateToken,
    authorize("Inventory", "update"),
    checkModuleEnabled("inventory"), validate(updateInventorySchema), inventoryController.update)
  .delete(authenticateToken,
    authorize("Inventory", "delete"),
    checkModuleEnabled("inventory"), validate(paramsInventorySchema, "params"), inventoryController.hardDelete) // soft delete
;

// V4.0 Inventory Stock Movement Engine, corrected: soft-delete/restore/bulk-soft-delete removed —
// Inventory is a derived, system-computed balance cache (recomputed from StockLedger by the
// posting engine), not user-managed master data. `create`/`update`/`hardDelete` above stay generic
// but are not the intended write path either — see inventory.service.js#applyMovement, the one
// path a posted WarehouseDocument actually uses.

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Inventory", "delete"),
    checkModuleEnabled("inventory"), validate(paramsInventoryIdsSchema), inventoryController.bulkHardDelete);


export default router;
