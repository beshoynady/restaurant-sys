import express from "express";
import purchaseReturnController from "./purchase-return.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createPurchaseReturnSchema,
  updatePurchaseReturnSchema,
  paramsPurchaseReturnSchema,
  paramsPurchaseReturnIdsSchema,
  queryPurchaseReturnSchema
} from "./purchase-return.validation.js";

const router = express.Router();

// PLATFORM_FINAL_AUDIT.md PA-05: same missing-RBAC defect as
// purchase-invoice.router.js — fixed the same way.

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("PurchaseReturns", "create"), checkModuleEnabled("purchasing"), validate(createPurchaseReturnSchema), purchaseReturnController.create)
  .get(authenticateToken, authorize("PurchaseReturns", "read"), checkModuleEnabled("purchasing"), validate(queryPurchaseReturnSchema), purchaseReturnController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("PurchaseReturns", "read"), checkModuleEnabled("purchasing"), validate(paramsPurchaseReturnSchema, "params"), purchaseReturnController.getOne)
  .put(authenticateToken, authorize("PurchaseReturns", "update"), checkModuleEnabled("purchasing"), validate(updatePurchaseReturnSchema), purchaseReturnController.update)
  .delete(authenticateToken, authorize("PurchaseReturns", "delete"), checkModuleEnabled("purchasing"), validate(paramsPurchaseReturnSchema, "params"), purchaseReturnController.hardDelete) // soft delete
;

// PLATFORM_FINAL_AUDIT.md, corrected: soft-delete/restore/bulk-soft-delete
// removed — PurchaseReturn already has Draft/Review/Partially Refunded/
// Fully Refunded/Rejected/Cancelled.

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, authorize("PurchaseReturns", "delete"), checkModuleEnabled("purchasing"), validate(paramsPurchaseReturnIdsSchema), purchaseReturnController.bulkHardDelete);


export default router;
