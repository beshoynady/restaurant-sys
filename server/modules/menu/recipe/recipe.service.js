import RecipeModel from "./recipe.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for recipe model
const recipeService = new AdvancedService(RecipeModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","product","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default recipeService;
