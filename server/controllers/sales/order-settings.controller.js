import asyncHandler from "../../utils/asyncHandler.js";
import orderSettingsService from "../../services/sales/order-settings.service.js";
import { validateOrderSettingsModel } from "../../validation/sales/order-settings.validation.js";

/* =========================
   CRUD Controller for order-settings
========================= */
const orderSettingsController = {
  create: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateOrderSettingsModel(req.body);
    const payload = { ...req.body, brand: brandId, branch: branchId, createdBy: userId };
    const result = await orderSettingsService.create(payload);
    res.status(201).json(result);
  }),

  getAll: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.branch._id;
    const result = await orderSettingsService.getAll({ ...req.query, brand: brandId, branch: branchId });
    res.json(result);
  }),

  getOne: asyncHandler(async (req, res) => {
    const result = await orderSettingsService.getById(req.params.id);
    res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateOrderSettingsModel(req.body, true);
    const payload = { ...req.body, brand: brandId, branch: branchId, updatedBy: userId };
    const result = await orderSettingsService.update(req.params.id, payload);
    res.json(result);
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await orderSettingsService.delete(req.params.id);
    res.json(result);
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await orderSettingsService.restore(req.params.id);
    res.json(result);
  }),
};

export default orderSettingsController;
