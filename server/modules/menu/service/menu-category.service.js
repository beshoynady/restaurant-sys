import MenuCategoryModel from "../../models/menu/menu-category.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for menu-category model
const menuCategoryService = new AdvancedService(MenuCategoryModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","parentCategory","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default menuCategoryService;
