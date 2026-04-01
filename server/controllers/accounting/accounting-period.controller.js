import asyncHandler from "../../utils/asyncHandler.js";
import accountingPeriodService from "../../services/accounting/accounting-period.service.js";
import { validateAccountingPeriodModel } from "../../validation/accounting/accounting-period.validation.js";

/* =========================
   CRUD Controller for accounting-period
========================= */
const accountingPeriodController = {
  create: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateAccountingPeriodModel(req.body);
    const payload = { ...req.body, brand: brandId, branch: branchId, createdBy: userId };
    const result = await accountingPeriodService.create(payload);
    res.status(201).json(result);
  }),

  getAll: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.branch._id;
    const result = await accountingPeriodService.getAll({ ...req.query, brand: brandId, branch: branchId });
    res.json(result);
  }),

  getOne: asyncHandler(async (req, res) => {
    const result = await accountingPeriodService.getById(req.params.id);
    res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateAccountingPeriodModel(req.body, true);
    const payload = { ...req.body, brand: brandId, branch: branchId, updatedBy: userId };
    const result = await accountingPeriodService.update(req.params.id, payload);
    res.json(result);
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await accountingPeriodService.delete(req.params.id);
    res.json(result);
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await accountingPeriodService.restore(req.params.id);
    res.json(result);
  }),
};

export default accountingPeriodController;
