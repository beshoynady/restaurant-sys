import ConsumptionModel from "../../models/inventory/consumption.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for consumption model
const consumptionService = new AdvancedCrudService(ConsumptionModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","Warehouse","preparationSection","shift","openedBy","closedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default consumptionService;
