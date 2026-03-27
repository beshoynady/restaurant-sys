import asyncHandler from "../../utils/asyncHandler.js";
import serviceChargeService from "../../services/system/service-charge.service.js";


// CRUD Controller for service-charge
const serviceChargeController = {
  create: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    
    const payload = { ...req.body, brand: brandId, branch: branchId, createdBy: userId };
    const result = await serviceChargeService.create(payload);
    res.status(201).json(result);
  }),

  getAll: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.branch._id;
    const result = await serviceChargeService.getAll({ ...req.query, brand: brandId, branch: branchId });
    res.json(result);
  }),

  getOne: asyncHandler(async (req, res) => {
    const result = await serviceChargeService.getById(req.params.id);
    res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    
    const payload = { ...req.body, brand: brandId, branch: branchId, updatedBy: userId };
    const result = await serviceChargeService.update(req.params.id, payload);
    res.json(result);
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await serviceChargeService.delete(req.params.id);
    res.json(result);
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await serviceChargeService.restore(req.params.id);
    res.json(result);
  }),
};

export default serviceChargeController;
