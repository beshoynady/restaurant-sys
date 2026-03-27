import asyncHandler from "../../utils/asyncHandler.js";
import purchaseReturnService from "../../services/purchasing/purchase-return.service.js";


// CRUD Controller for purchase-return
const purchaseReturnController = {
  create: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    
    const payload = { ...req.body, brand: brandId, branch: branchId, createdBy: userId };
    const result = await purchaseReturnService.create(payload);
    res.status(201).json(result);
  }),

  getAll: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.branch._id;
    const result = await purchaseReturnService.getAll({ ...req.query, brand: brandId, branch: branchId });
    res.json(result);
  }),

  getOne: asyncHandler(async (req, res) => {
    const result = await purchaseReturnService.getById(req.params.id);
    res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    
    const payload = { ...req.body, brand: brandId, branch: branchId, updatedBy: userId };
    const result = await purchaseReturnService.update(req.params.id, payload);
    res.json(result);
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await purchaseReturnService.delete(req.params.id);
    res.json(result);
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await purchaseReturnService.restore(req.params.id);
    res.json(result);
  }),
};

export default purchaseReturnController;
