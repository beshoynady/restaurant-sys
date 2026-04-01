import asyncHandler from "../../utils/asyncHandler.js";
import employeeFinancialTransactionService from "../../services/employees/employee-financial-transaction.service.js";
import { validateEmployeeFinancialTransactionModel } from "../../validation/employees/employee-financial-transaction.validation.js";

/* =========================
   CRUD Controller for employee-financial-transaction
========================= */
const employeeFinancialTransactionController = {
  create: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateEmployeeFinancialTransactionModel(req.body);
    const payload = { ...req.body, brand: brandId, branch: branchId, createdBy: userId };
    const result = await employeeFinancialTransactionService.create(payload);
    res.status(201).json(result);
  }),

  getAll: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.branch._id;
    const result = await employeeFinancialTransactionService.getAll({ ...req.query, brand: brandId, branch: branchId });
    res.json(result);
  }),

  getOne: asyncHandler(async (req, res) => {
    const result = await employeeFinancialTransactionService.getById(req.params.id);
    res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateEmployeeFinancialTransactionModel(req.body, true);
    const payload = { ...req.body, brand: brandId, branch: branchId, updatedBy: userId };
    const result = await employeeFinancialTransactionService.update(req.params.id, payload);
    res.json(result);
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await employeeFinancialTransactionService.delete(req.params.id);
    res.json(result);
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await employeeFinancialTransactionService.restore(req.params.id);
    res.json(result);
  }),
};

export default employeeFinancialTransactionController;
