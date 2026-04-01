import asyncHandler from "../../utils/asyncHandler.js";
import assetDepreciationService from "../../services/assets/asset-depreciation.service.js";
import { validateAssetDepreciationModel } from "../../validation/assets/asset-depreciation.validation.js";

/* =========================
   CRUD Controller for asset-depreciation
========================= */
const assetDepreciationController = {
  create: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateAssetDepreciationModel(req.body);
    const payload = { ...req.body, brand: brandId, branch: branchId, createdBy: userId };
    const result = await assetDepreciationService.create(payload);
    res.status(201).json(result);
  }),

  getAll: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.branch._id;
    const result = await assetDepreciationService.getAll({ ...req.query, brand: brandId, branch: branchId });
    res.json(result);
  }),

  getOne: asyncHandler(async (req, res) => {
    const result = await assetDepreciationService.getById(req.params.id);
    res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    validateAssetDepreciationModel(req.body, true);
    const payload = { ...req.body, brand: brandId, branch: branchId, updatedBy: userId };
    const result = await assetDepreciationService.update(req.params.id, payload);
    res.json(result);
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await assetDepreciationService.delete(req.params.id);
    res.json(result);
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await assetDepreciationService.restore(req.params.id);
    res.json(result);
  }),
};

export default assetDepreciationController;
