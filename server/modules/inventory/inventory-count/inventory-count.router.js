import express from "express";
import inventoryCountController from "./inventory-count.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createInventoryCountSchema,
  updateInventoryCountSchema,
  paramsInventoryCountSchema,
  paramsInventoryCountIdsSchema,
  queryInventoryCountSchema,
  transitionInventoryCountSchema
} from "./inventory-count.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("InventoryCounts", "create"),
    checkModuleEnabled("inventory"), validate(createInventoryCountSchema), inventoryCountController.create)
  .get(authenticateToken,
    authorize("InventoryCounts", "read"),
    checkModuleEnabled("inventory"), validate(queryInventoryCountSchema), inventoryCountController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("InventoryCounts", "read"),
    checkModuleEnabled("inventory"), validate(paramsInventoryCountSchema, "params"), inventoryCountController.getOne)
  .put(authenticateToken,
    authorize("InventoryCounts", "update"),
    checkModuleEnabled("inventory"), validate(updateInventoryCountSchema), inventoryCountController.update)
  .delete(authenticateToken,
    authorize("InventoryCounts", "delete"),
    checkModuleEnabled("inventory"), validate(paramsInventoryCountSchema, "params"), inventoryCountController.hardDelete) // soft delete
;

// Supply Chain & Commerce Platform V5.1: InventoryCount is a transactional document with its own
// Draft/InProgress/Submitted/Approved/Executed/Canceled lifecycle — soft-delete/restore removed
// (was `softDelete: true`, an unrecognized/ignored BaseRepository option, never actually active),
// matching the convention already established for PurchaseInvoice/PurchaseOrder/GoodsReceiptNote:
// a mistaken count is cancelled via the transition action below, not deleted.
router.route("/:id/transition")
  .post(authenticateToken,
    authorize("InventoryCounts", "update"),
    checkModuleEnabled("inventory"), validate(paramsInventoryCountSchema, "params"), validate(transitionInventoryCountSchema), inventoryCountController.transition);

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("InventoryCounts", "delete"),
    checkModuleEnabled("inventory"), validate(paramsInventoryCountIdsSchema), inventoryCountController.bulkHardDelete);


export default router;
