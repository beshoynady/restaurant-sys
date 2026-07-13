import express from "express";
import warehouseDocumentController from "./warehouse-document.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createWarehouseDocumentSchema,
  updateWarehouseDocumentSchema,
  paramsWarehouseDocumentSchema,
  paramsWarehouseDocumentIdsSchema,
  queryWarehouseDocumentSchema,
} from "./warehouse-document.validation.js";

const router = express.Router();

// V4.0 Inventory Stock Movement Engine: this router had authenticateToken only — no
// authorize()/checkModuleEnabled() — matching the same defect class already fixed elsewhere this
// engagement (PA-05/PA-07/PA-13). Fixed the same way. Also unmounted until this phase.

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("WarehouseDocuments", "create"), checkModuleEnabled("inventory"), validate(createWarehouseDocumentSchema), warehouseDocumentController.create)
  .get(authenticateToken, authorize("WarehouseDocuments", "read"), checkModuleEnabled("inventory"), validate(queryWarehouseDocumentSchema), warehouseDocumentController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("WarehouseDocuments", "read"), checkModuleEnabled("inventory"), validate(paramsWarehouseDocumentSchema, "params"), warehouseDocumentController.getOne)
  .put(authenticateToken, authorize("WarehouseDocuments", "update"), checkModuleEnabled("inventory"), validate(updateWarehouseDocumentSchema), warehouseDocumentController.update)
  .delete(authenticateToken, authorize("WarehouseDocuments", "delete"), checkModuleEnabled("inventory"), validate(paramsWarehouseDocumentSchema, "params"), warehouseDocumentController.hardDelete)
;

// V4.0 Inventory Stock Movement Engine: the actual posting action — moves stock.
router.post(
  "/:id/post",
  authenticateToken,
  authorize("WarehouseDocuments", "approve"),
  checkModuleEnabled("inventory"),
  validate(paramsWarehouseDocumentSchema, "params"),
  warehouseDocumentController.post,
);

// PLATFORM_FINAL_AUDIT.md PA-22, corrected: soft-delete/restore/bulk-soft-delete removed —
// WarehouseDocument is a transactional document with its own status lifecycle
// (draft/approved/posted/canceled); a mistaken draft is edited or left in draft, not soft-deleted,
// and a posted document is never deleted (it has already moved stock).

// --- BULK HARD DELETE ---
router.route("/bulk-delete")
  .delete(authenticateToken, authorize("WarehouseDocuments", "delete"), checkModuleEnabled("inventory"), validate(paramsWarehouseDocumentIdsSchema), warehouseDocumentController.bulkHardDelete);

export default router;
