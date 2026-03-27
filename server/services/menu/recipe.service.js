import RecipeModel from "../../models/menu/recipe.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for recipe model
const recipeService = new AdvancedCrudService(RecipeModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","product","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default recipeService;
