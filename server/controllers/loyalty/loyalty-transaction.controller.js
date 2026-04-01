import asyncHandler from "../../utils/asyncHandler.js";
import loyaltyTransactionService from "../../services/loyalty/loyalty-transaction.service.js";
import { validateLoyaltyTransactionModel } from "../../validation/loyalty/loyalty-transaction.validation.js";

/* =========================
   CRUD Controller for loyalty-transaction
========================= */
const loyaltyTransactionController = {
  create: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateLoyaltyTransactionModel(req.body);
    const payload = { ...req.body, brand: brandId, branch: branchId, createdBy: userId };
    const result = await loyaltyTransactionService.create(payload);
    res.status(201).json(result);
  }),

  getAll: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.branch._id;
    const result = await loyaltyTransactionService.getAll({ ...req.query, brand: brandId, branch: branchId });
    res.json(result);
  }),

  getOne: asyncHandler(async (req, res) => {
    const result = await loyaltyTransactionService.getById(req.params.id);
    res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateLoyaltyTransactionModel(req.body, true);
    const payload = { ...req.body, brand: brandId, branch: branchId, updatedBy: userId };
    const result = await loyaltyTransactionService.update(req.params.id, payload);
    res.json(result);
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await loyaltyTransactionService.delete(req.params.id);
    res.json(result);
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await loyaltyTransactionService.restore(req.params.id);
    res.json(result);
  }),
};

export default loyaltyTransactionController;
