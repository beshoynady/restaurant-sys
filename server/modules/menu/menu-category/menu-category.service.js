import MenuCategoryModel from "./menu-category.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for menu-category model
const menuCategoryService = new AdvancedService(MenuCategoryModel, {
  brandScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","parentCategory","createdBy","updatedBy","deletedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default menuCategoryService;
