import AssetCategoryModel from "../../models/assets/asset-category.model.js";

const AssetCategoryService = new AdvancedService(AssetCategoryModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});


export default AssetCategoryService;