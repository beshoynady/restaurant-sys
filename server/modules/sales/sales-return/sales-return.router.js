import express from "express";
import salesReturnController from "./sales-return.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createSalesReturnSchema,
  updateSalesReturnSchema,
  paramsSalesReturnSchema,
  paramsSalesReturnIdsSchema,
  querySalesReturnSchema
} from "./sales-return.validation.js";

const router = express.Router();

// PLATFORM_FINAL_AUDIT.md PA-13: this router had authenticateToken only —
// no authorize()/checkModuleEnabled() — and was never mounted. Both fixed
// together, matching the standard chain used by every other mounted router.

// Create & GetAll
router.route("/")
  .post(authenticateToken, authorize("SalesReturns", "create"), checkModuleEnabled("sales"), validate(createSalesReturnSchema), salesReturnController.create)
  .get(authenticateToken, authorize("SalesReturns", "read"), checkModuleEnabled("sales"), validate(querySalesReturnSchema), salesReturnController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, authorize("SalesReturns", "read"), checkModuleEnabled("sales"), validate(paramsSalesReturnSchema, "params"), salesReturnController.getOne)
  .put(authenticateToken, authorize("SalesReturns", "update"), checkModuleEnabled("sales"), validate(updateSalesReturnSchema), salesReturnController.update)
  .delete(authenticateToken, authorize("SalesReturns", "delete"), checkModuleEnabled("sales"), validate(paramsSalesReturnSchema, "params"), salesReturnController.hardDelete) // soft delete
;

// PLATFORM_FINAL_AUDIT.md, corrected: soft-delete/restore/bulk-soft-delete
// removed — SalesReturn's refundStatus now includes CANCELLED; a mistaken
// return is cancelled via PUT, not deleted.

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, authorize("SalesReturns", "delete"), checkModuleEnabled("sales"), validate(paramsSalesReturnIdsSchema), salesReturnController.bulkHardDelete);


export default router;
