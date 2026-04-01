import asyncHandler from "../../utils/asyncHandler.js";
import offlineCustomerService from "../../services/customers/offline-customer.service.js";
import { validateOfflineCustomerModel } from "../../validation/customers/offline-customer.validation.js";

/* =========================
   CRUD Controller for offline-customer
========================= */
const offlineCustomerController = {
  create: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateOfflineCustomerModel(req.body);
    const payload = { ...req.body, brand: brandId, branch: branchId, createdBy: userId };
    const result = await offlineCustomerService.create(payload);
    res.status(201).json(result);
  }),

  getAll: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.branch._id;
    const result = await offlineCustomerService.getAll({ ...req.query, brand: brandId, branch: branchId });
    res.json(result);
  }),

  getOne: asyncHandler(async (req, res) => {
    const result = await offlineCustomerService.getById(req.params.id);
    res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateOfflineCustomerModel(req.body, true);
    const payload = { ...req.body, brand: brandId, branch: branchId, updatedBy: userId };
    const result = await offlineCustomerService.update(req.params.id, payload);
    res.json(result);
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await offlineCustomerService.delete(req.params.id);
    res.json(result);
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await offlineCustomerService.restore(req.params.id);
    res.json(result);
  }),
};

export default offlineCustomerController;
