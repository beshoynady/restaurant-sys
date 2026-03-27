import asyncHandler from "../../utils/asyncHandler.js";
import productionRecipeService from "../../services/production/production-recipe.service.js";


// CRUD Controller for production-recipe
const productionRecipeController = {
  create: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    
    const payload = { ...req.body, brand: brandId, branch: branchId, createdBy: userId };
    const result = await productionRecipeService.create(payload);
    res.status(201).json(result);
  }),

  getAll: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.branch._id;
    const result = await productionRecipeService.getAll({ ...req.query, brand: brandId, branch: branchId });
    res.json(result);
  }),

  getOne: asyncHandler(async (req, res) => {
    const result = await productionRecipeService.getById(req.params.id);
    res.json(result);
  }),

  update: asyncHandler(async (req, res) => {
    const brandId = req.brand._id;
    const branchId = req.body.branch ?? req.branch._id;
    const userId = req.user._id;
    
    const payload = { ...req.body, brand: brandId, branch: branchId, updatedBy: userId };
    const result = await productionRecipeService.update(req.params.id, payload);
    res.json(result);
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await productionRecipeService.delete(req.params.id);
    res.json(result);
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await productionRecipeService.restore(req.params.id);
    res.json(result);
  }),
};

export default productionRecipeController;
