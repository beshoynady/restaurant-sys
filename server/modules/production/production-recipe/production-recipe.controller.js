import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import productionRecipeService from "./production-recipe.service.js";

class ProductionRecipeController extends BaseController {
  constructor() {
    super(productionRecipeService);
  }

  previewCost = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const cost = await productionRecipeService.previewCost({
      id: req.params.id, brand: brandId,
      overrideBatchSize: req.query.batchSize ? Number(req.query.batchSize) : null,
    });
    res.json({ success: true, data: cost });
  });

  refreshCost = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const recipe = await productionRecipeService.refreshCost({ id: req.params.id, brand: brandId });
    res.json({ success: true, data: recipe });
  });
}

export default new ProductionRecipeController();
