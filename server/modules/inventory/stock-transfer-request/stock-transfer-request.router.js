import express from "express";
import stockTransferRequestController from "./stock-transfer-request.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createStockTransferRequestSchema,
  updateStockTransferRequestSchema,
  paramsStockTransferRequestSchema,
  paramsStockTransferRequestIdsSchema,
  queryStockTransferRequestSchema,
  transitionStockTransferRequestSchema
} from "./stock-transfer-request.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("StockTransferRequests", "create"),
    checkModuleEnabled("inventory"), validate(createStockTransferRequestSchema), stockTransferRequestController.create)
  .get(authenticateToken,
    authorize("StockTransferRequests", "read"),
    checkModuleEnabled("inventory"), validate(queryStockTransferRequestSchema), stockTransferRequestController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("StockTransferRequests", "read"),
    checkModuleEnabled("inventory"), validate(paramsStockTransferRequestSchema, "params"), stockTransferRequestController.getOne)
  .put(authenticateToken,
    authorize("StockTransferRequests", "update"),
    checkModuleEnabled("inventory"), validate(updateStockTransferRequestSchema), stockTransferRequestController.update)
  .delete(authenticateToken,
    authorize("StockTransferRequests", "delete"),
    checkModuleEnabled("inventory"), validate(paramsStockTransferRequestSchema, "params"), stockTransferRequestController.hardDelete) // soft delete
;

// Supply Chain & Commerce Platform V5.1: transactional document with its own lifecycle —
// soft-delete/restore removed (was `softDelete: true`, unrecognized/ignored), matching the
// convention already applied to InventoryCount/PurchaseInvoice/PurchaseOrder/GoodsReceiptNote.
router.route("/:id/transition")
  .post(authenticateToken,
    authorize("StockTransferRequests", "update"),
    checkModuleEnabled("inventory"), validate(paramsStockTransferRequestSchema, "params"), validate(transitionStockTransferRequestSchema), stockTransferRequestController.transition);

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("StockTransferRequests", "delete"),
    checkModuleEnabled("inventory"), validate(paramsStockTransferRequestIdsSchema), stockTransferRequestController.bulkHardDelete);


export default router;
