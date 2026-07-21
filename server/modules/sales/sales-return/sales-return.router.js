import express from "express";
import salesReturnController from "./sales-return.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  requestRefundSchema,
  approveRefundSchema,
  rejectRefundSchema,
  settleRefundSchema,
  updateSalesReturnSchema,
  paramsSalesReturnSchema,
  paramsSalesReturnIdsSchema,
  querySalesReturnSchema
} from "./sales-return.validation.js";

const router = express.Router();

// PLATFORM_FINAL_AUDIT.md PA-13: this router had authenticateToken only —
// no authorize()/checkModuleEnabled() — and was never mounted. Both fixed
// together, matching the standard chain used by every other mounted router.
//
// ADR-001 Phase 2: POST "/" now validates against requestRefundSchema (the real refund-request
// shape: originalInvoice/order/itemIds/reason/refundMethod/idempotencyKey) instead of the generic
// full-model createSalesReturnSchema — mirrors payment.router.js's own POST "/" -> recordPayment()
// precedent. `total`/`subtotal`/`refundStatus`/etc. are server-computed, never client input.

// Create (= requestRefund) & GetAll
router.route("/")
  .post(authenticateToken, authorize("SalesReturns", "create"), checkModuleEnabled("sales"), validate(requestRefundSchema), salesReturnController.create)
  .get(authenticateToken, authorize("SalesReturns", "read"), checkModuleEnabled("sales"), validate(querySalesReturnSchema), salesReturnController.getAll)
;

// GetOne, Update (locked-field-protected — see sales-return.service.js's lockedUpdateFields), hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("SalesReturns", "read"), checkModuleEnabled("sales"), validate(paramsSalesReturnSchema, "params"), salesReturnController.getOne)
  .put(authenticateToken, authorize("SalesReturns", "update"), checkModuleEnabled("sales"), validate(updateSalesReturnSchema), salesReturnController.update)
  .delete(authenticateToken, authorize("SalesReturns", "delete"), checkModuleEnabled("sales"), validate(paramsSalesReturnSchema, "params"), salesReturnController.hardDelete) // soft delete
;

// ADR-001 Phase 2 — dedicated action endpoints, not overloaded onto the generic PUT (matching
// payment.router.js/waste-record.router.js's own "business-logic action = dedicated route, not a
// generic update" convention). "approve"/"reject" use the "SalesReturns:approve" permission-adjacent
// action name for RBAC visibility, but real authorization is SalesReturnSettings.decisionBy
// (job-title-based, checked in the service layer) — see sales-return.service.js.
router.post("/:id/approve", authenticateToken, authorize("SalesReturns", "approve"), checkModuleEnabled("sales"), validate(approveRefundSchema), salesReturnController.approve);
router.post("/:id/reject", authenticateToken, authorize("SalesReturns", "reject"), checkModuleEnabled("sales"), validate(rejectRefundSchema), salesReturnController.reject);
router.post("/:id/settle", authenticateToken, authorize("SalesReturns", "update"), checkModuleEnabled("sales"), validate(settleRefundSchema), salesReturnController.settleRefund);

// PLATFORM_FINAL_AUDIT.md, corrected: soft-delete/restore/bulk-soft-delete
// removed — SalesReturn's refundStatus now includes CANCELLED; a mistaken
// return is cancelled via PUT, not deleted.

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, authorize("SalesReturns", "delete"), checkModuleEnabled("sales"), validate(paramsSalesReturnIdsSchema), salesReturnController.bulkHardDelete);


export default router;
