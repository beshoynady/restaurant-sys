import AssetCategoryModel from "./asset-category.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

const AssetCategoryService = new AdvancedService(AssetCategoryModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});


export default AssetCategoryService;