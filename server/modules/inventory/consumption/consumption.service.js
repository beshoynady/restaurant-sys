import ConsumptionModel from "./consumption.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for consumption model
const consumptionService = new AdvancedService(ConsumptionModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","Warehouse","preparationSection","shift","openedBy","closedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default consumptionService;
