// ADR-001 Phase 2 — brand/branch/actorId ONLY from req.user, never req.body/req.query/req.params,
// matching ERP_DEVELOPMENT_STANDARD.md §4 and payment.controller.js's own precedent.
import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import salesReturnService from "./sales-return.service.js";

class SalesReturnController extends BaseController {
  constructor() {
    super(salesReturnService);
  }

  // Overrides the inherited generic BaseController.create — a SalesReturn is never a plain
  // document insert, it's always the requestRefund() orchestration (invoice-line claim,
  // approval-threshold gate, conditional Step A/B posting). See sales-return.router.js.
  create = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const salesReturn = await salesReturnService.requestRefund({
      brand: brandId,
      branch: branchId,
      originalInvoice: req.body.originalInvoice,
      order: req.body.order,
      itemIds: req.body.itemIds,
      reason: req.body.reason,
      refundMethod: req.body.refundMethod,
      idempotencyKey: req.body.idempotencyKey,
      actorId: userId,
    });
    return this.sendResponse(res, { statusCode: 201, message: "Refund requested", data: salesReturn });
  });

  approve = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const salesReturn = await salesReturnService.approve({
      id: req.params.id, brand: brandId, branch: branchId,
      refundMethod: req.body.refundMethod, actorId: userId,
    });
    return this.sendResponse(res, { statusCode: 200, message: "Refund approved", data: salesReturn });
  });

  reject = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const salesReturn = await salesReturnService.reject({
      id: req.params.id, brand: brandId, branch: branchId,
      reason: req.body.reason, actorId: userId,
    });
    return this.sendResponse(res, { statusCode: 200, message: "Refund rejected", data: salesReturn });
  });

  settleRefund = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const salesReturn = await salesReturnService.settleRefund({
      id: req.params.id, brand: brandId, branch: branchId,
      refundMethod: req.body.refundMethod, actorId: userId,
    });
    return this.sendResponse(res, { statusCode: 200, message: "Refund settled", data: salesReturn });
  });
}

export default new SalesReturnController();
