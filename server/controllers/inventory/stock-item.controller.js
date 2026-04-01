import asyncHandler from "../../utils/asyncHandler.js";
import stockItemService from "../../services/inventory/stock-item.service.js";
import { validateStockItemModel } from "../../validation/inventory/stock-item.validation.js";

/* =========================
   CRUD Controller for stock-item
========================= */
const stockItemController = {
  create: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateStockItemModel(req.body);
    const payload = { ...req.body, brand: brandId, branch: branchId, createdBy: userId };
    const result = await stockItemService.create(payload);
    res.status(201).json(result);
  }),

  getAll: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.branch._id;
    const result = await stockItemService.getAll({ ...req.query, brand: brandId, branch: branchId });
    res.json(result);
  }),

  getOne: asyncHandler(async (req, res) => {
    const result = await stockItemService.getById(req.params.id);
    res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateStockItemModel(req.body, true);
    const payload = { ...req.body, brand: brandId, branch: branchId, updatedBy: userId };
    const result = await stockItemService.update(req.params.id, payload);
    res.json(result);
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await stockItemService.delete(req.params.id);
    res.json(result);
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await stockItemService.restore(req.params.id);
    res.json(result);
  }),
};

export default stockItemController;
