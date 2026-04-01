import BaseController from "../BaseController.js";
import recipeService from "../../services/menu/recipe.service.js";

class RecipeController extends BaseController {
  constructor() {
    super(recipeService);
  }
}

export default new RecipeController();
