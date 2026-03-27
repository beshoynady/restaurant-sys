import asyncHandler from "../../utils/asyncHandler.js";
import preparationSectionService from "../../services/kitchen/preparation-section.service.js";


// CRUD Controller for preparation-section
const preparationSectionController = {
  create: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    
    const payload = { ...req.body, brand: brandId, branch: branchId, createdBy: userId };
    const result = await preparationSectionService.create(payload);
    res.status(201).json(result);
  }),

  getAll: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.branch._id;
    const result = await preparationSectionService.getAll({ ...req.query, brand: brandId, branch: branchId });
    res.json(result);
  }),

  getOne: asyncHandler(async (req, res) => {
    const result = await preparationSectionService.getById(req.params.id);
    res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    
    const payload = { ...req.body, brand: brandId, branch: branchId, updatedBy: userId };
    const result = await preparationSectionService.update(req.params.id, payload);
    res.json(result);
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await preparationSectionService.delete(req.params.id);
    res.json(result);
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await preparationSectionService.restore(req.params.id);
    res.json(result);
  }),
};

export default preparationSectionController;
