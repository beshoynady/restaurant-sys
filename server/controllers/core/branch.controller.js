import asyncHandler from "../../utils/asyncHandler.js";
import branchService from "../../services/core/branch.service.js";


// CRUD Controller for branch
const branchController = {
  create: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    
    const payload = { ...req.body, brand: brandId, branch: branchId, createdBy: userId };
    const result = await branchService.create(payload);
    res.status(201).json(result);
  }),

  getAll: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.branch._id;
    const result = await branchService.getAll({ ...req.query, brand: brandId, branch: branchId });
    res.json(result);
  }),

  getOne: asyncHandler(async (req, res) => {
    const result = await branchService.getById(req.params.id);
    res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    
    const payload = { ...req.body, brand: brandId, branch: branchId, updatedBy: userId };
    const result = await branchService.update(req.params.id, payload);
    res.json(result);
  }),

  findOneAndUpdate: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const payload = { ...req.body, brand: brandId, branch: branchId };
    const result = await branchService.findOneAndUpdate({ brandId, filter: { _id: req.params.id }, data: payload });
    res.json(result);
  }
  ),

  delete: asyncHandler(async (req, res) => {
    const result = await branchService.delete(req.params.id);
    res.json(result);
  }),
  
  softDelete: asyncHandler(async (req, res) => {
    const result = await branchService.softDelete(req.params.id);
    res.json(result);
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await branchService.restore(req.params.id);
    res.json(result);
  }),


};

export default branchController;
