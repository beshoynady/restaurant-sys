import ProductionRecordModel from "./production-record.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for production-record model
const productionRecordService = new AdvancedService(ProductionRecordModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["productionOrder","warehouse","stockItem","preparationSection","productionRecipe","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default productionRecordService;
