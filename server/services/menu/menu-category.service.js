import MenuCategoryModel from "../../models/menu/menu-category.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for menu-category model
const menuCategoryService = new AdvancedCrudService(MenuCategoryModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","parentCategory","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default menuCategoryService;
