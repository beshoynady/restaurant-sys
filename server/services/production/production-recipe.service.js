import ProductionRecipeModel from "../../models/production/production-recipe.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for production-recipe model
const productionRecipeService = new AdvancedCrudService(ProductionRecipeModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","stockItem","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default productionRecipeService;
