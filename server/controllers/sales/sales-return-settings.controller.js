import asyncHandler from "../../utils/asyncHandler.js";
import salesReturnSettingsService from "../../services/sales/sales-return-settings.service.js";
import { validateSalesReturnSettingsModel } from "../../validation/sales/sales-return-settings.validation.js";

/* =========================
   CRUD Controller for sales-return-settings
========================= */
const salesReturnSettingsController = {
  create: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateSalesReturnSettingsModel(req.body);
    const payload = { ...req.body, brand: brandId, branch: branchId, createdBy: userId };
    const result = await salesReturnSettingsService.create(payload);
    res.status(201).json(result);
  }),

  getAll: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.branch._id;
    const result = await salesReturnSettingsService.getAll({ ...req.query, brand: brandId, branch: branchId });
    res.json(result);
  }),

  getOne: asyncHandler(async (req, res) => {
    const result = await salesReturnSettingsService.getById(req.params.id);
    res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateSalesReturnSettingsModel(req.body, true);
    const payload = { ...req.body, brand: brandId, branch: branchId, updatedBy: userId };
    const result = await salesReturnSettingsService.update(req.params.id, payload);
    res.json(result);
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await salesReturnSettingsService.delete(req.params.id);
    res.json(result);
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await salesReturnSettingsService.restore(req.params.id);
    res.json(result);
  }),
};

export default salesReturnSettingsController;
