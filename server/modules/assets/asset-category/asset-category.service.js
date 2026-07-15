import AssetCategoryModel from "./asset-category.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

const AssetCategoryService = new AdvancedService(AssetCategoryModel, {
  brandScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});


export default AssetCategoryService;