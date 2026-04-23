import BaseController from "../../utils/BaseController.js";
import recipeService from "./recipe.service.js";

class RecipeController extends BaseController {
  constructor() {
    super(recipeService);
  }
}

export default new RecipeController();
