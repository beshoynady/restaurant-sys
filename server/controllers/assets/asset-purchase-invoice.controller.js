import asyncHandler from "../../utils/asyncHandler.js";
import assetPurchaseInvoiceService from "../../services/assets/asset-purchase-invoice.service.js";
import { validateAssetPurchaseInvoiceModel } from "../../validation/assets/asset-purchase-invoice.validation.js";

/* =========================
   CRUD Controller for asset-purchase-invoice
========================= */
const assetPurchaseInvoiceController = {
  create: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateAssetPurchaseInvoiceModel(req.body);
    const payload = { ...req.body, brand: brandId, branch: branchId, createdBy: userId };
    const result = await assetPurchaseInvoiceService.create(payload);
    res.status(201).json(result);
  }),

  getAll: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.branch._id;
    const result = await assetPurchaseInvoiceService.getAll({ ...req.query, brand: brandId, branch: branchId });
    res.json(result);
  }),

  getOne: asyncHandler(async (req, res) => {
    const result = await assetPurchaseInvoiceService.getById(req.params.id);
    res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateAssetPurchaseInvoiceModel(req.body, true);
    const payload = { ...req.body, brand: brandId, branch: branchId, updatedBy: userId };
    const result = await assetPurchaseInvoiceService.update(req.params.id, payload);
    res.json(result);
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await assetPurchaseInvoiceService.delete(req.params.id);
    res.json(result);
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await assetPurchaseInvoiceService.restore(req.params.id);
    res.json(result);
  }),
};

export default assetPurchaseInvoiceController;
