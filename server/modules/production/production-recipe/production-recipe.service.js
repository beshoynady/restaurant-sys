import ProductionRecipeModel from "./production-recipe.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for production-recipe model
const productionRecipeService = new AdvancedService(ProductionRecipeModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","stockItem","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default productionRecipeService;
