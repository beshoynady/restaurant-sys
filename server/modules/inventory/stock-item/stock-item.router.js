import express from "express";
import stockItemController from "./stock-item.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createStockItemSchema, 
  updateStockItemSchema, 
  paramsStockItemSchema, 
  paramsStockItemIdsSchema,
  queryStockItemSchema 
} from "./stock-item.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("StockItems", "create"),
    checkModuleEnabled("inventory"), validate(createStockItemSchema), stockItemController.create)
  .get(authenticateToken,
    authorize("StockItems", "read"),
    checkModuleEnabled("inventory"), validate(queryStockItemSchema), stockItemController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("StockItems", "read"),
    checkModuleEnabled("inventory"), validate(paramsStockItemSchema, "params"), stockItemController.getOne)
  .put(authenticateToken,
    authorize("StockItems", "update"),
    checkModuleEnabled("inventory"), validate(updateStockItemSchema), stockItemController.update)
  .delete(authenticateToken,
    authorize("StockItems", "delete"),
    checkModuleEnabled("inventory"), validate(paramsStockItemSchema, "params"), stockItemController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("StockItems", "delete"),
    checkModuleEnabled("inventory"), validate(paramsStockItemSchema, "params"), stockItemController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("StockItems", "update"),
    checkModuleEnabled("inventory"), validate(paramsStockItemSchema, "params"), stockItemController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("StockItems", "delete"),
    checkModuleEnabled("inventory"), validate(paramsStockItemIdsSchema), stockItemController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("StockItems", "delete"),
    checkModuleEnabled("inventory"),validate(paramsStockItemIdsSchema), stockItemController.bulkSoftDelete);


export default router;
