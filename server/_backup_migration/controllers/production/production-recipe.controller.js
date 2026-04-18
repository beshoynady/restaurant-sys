import BaseController from "../../utils/BaseController.js";
import productionRecipeService from "../../services/production/production-recipe.service.js";

class ProductionRecipeController extends BaseController {
  constructor() {
    super(productionRecipeService);
  }
}

export default new ProductionRecipeController();
