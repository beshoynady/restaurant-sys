import asyncHandler from "../../utils/asyncHandler.js";
import supplierTransactionService from "../../services/purchasing/supplier-transaction.service.js";
import { validateSupplierTransactionModel } from "../../validation/purchasing/supplier-transaction.validation.js";

/* =========================
   CRUD Controller for supplier-transaction
========================= */
const supplierTransactionController = {
  create: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateSupplierTransactionModel(req.body);
    const payload = { ...req.body, brand: brandId, branch: branchId, createdBy: userId };
    const result = await supplierTransactionService.create(payload);
    res.status(201).json(result);
  }),

  getAll: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.branch._id;
    const result = await supplierTransactionService.getAll({ ...req.query, brand: brandId, branch: branchId });
    res.json(result);
  }),

  getOne: asyncHandler(async (req, res) => {
    const result = await supplierTransactionService.getById(req.params.id);
    res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateSupplierTransactionModel(req.body, true);
    const payload = { ...req.body, brand: brandId, branch: branchId, updatedBy: userId };
    const result = await supplierTransactionService.update(req.params.id, payload);
    res.json(result);
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await supplierTransactionService.delete(req.params.id);
    res.json(result);
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await supplierTransactionService.restore(req.params.id);
    res.json(result);
  }),
};

export default supplierTransactionController;
