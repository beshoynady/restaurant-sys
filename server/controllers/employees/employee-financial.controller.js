import asyncHandler from "../../utils/asyncHandler.js";
import employeeFinancialService from "../../services/employees/employee-financial.service.js";
import { validateEmployeeFinancialModel } from "../../validation/employees/employee-financial.validation.js";

/* =========================
   CRUD Controller for employee-financial
========================= */
const employeeFinancialController = {
  create: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateEmployeeFinancialModel(req.body);
    const payload = { ...req.body, brand: brandId, branch: branchId, createdBy: userId };
    const result = await employeeFinancialService.create(payload);
    res.status(201).json(result);
  }),

  getAll: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.branch._id;
    const result = await employeeFinancialService.getAll({ ...req.query, brand: brandId, branch: branchId });
    res.json(result);
  }),

  getOne: asyncHandler(async (req, res) => {
    const result = await employeeFinancialService.getById(req.params.id);
    res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateEmployeeFinancialModel(req.body, true);
    const payload = { ...req.body, brand: brandId, branch: branchId, updatedBy: userId };
    const result = await employeeFinancialService.update(req.params.id, payload);
    res.json(result);
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await employeeFinancialService.delete(req.params.id);
    res.json(result);
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await employeeFinancialService.restore(req.params.id);
    res.json(result);
  }),
};

export default employeeFinancialController;
