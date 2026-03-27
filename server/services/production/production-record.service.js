import ProductionRecordModel from "../../models/production/production-record.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for production-record model
const productionRecordService = new AdvancedCrudService(ProductionRecordModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["productionOrder","warehouse","stockItem","preparationSection","productionRecipe","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default productionRecordService;
