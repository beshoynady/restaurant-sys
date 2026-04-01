import asyncHandler from "../../utils/asyncHandler.js";
import accountBalanceService from "../../services/accounting/account-balance.service.js";
import { validateAccountBalanceModel } from "../../validation/accounting/account-balance.validation.js";

/* =========================
   CRUD Controller for account-balance
========================= */
const accountBalanceController = {
  create: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateAccountBalanceModel(req.body);
    const payload = { ...req.body, brand: brandId, branch: branchId, createdBy: userId };
    const result = await accountBalanceService.create(payload);
    res.status(201).json(result);
  }),

  getAll: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.branch._id;
    const result = await accountBalanceService.getAll({ ...req.query, brand: brandId, branch: branchId });
    res.json(result);
  }),

  getOne: asyncHandler(async (req, res) => {
    const result = await accountBalanceService.getById(req.params.id);
    res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateAccountBalanceModel(req.body, true);
    const payload = { ...req.body, brand: brandId, branch: branchId, updatedBy: userId };
    const result = await accountBalanceService.update(req.params.id, payload);
    res.json(result);
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await accountBalanceService.delete(req.params.id);
    res.json(result);
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await accountBalanceService.restore(req.params.id);
    res.json(result);
  }),
};

export default accountBalanceController;
