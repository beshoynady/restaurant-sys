import AssetTransactionsModel from "../../models/assets/asset-transactions.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for asset-transactions model
const assetTransactionsService = new AdvancedCrudService(AssetTransactionsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","asset","createdBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default assetTransactionsService;
