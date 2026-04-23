import DiningAreaModel from "./dining-area.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for dining-area model
const diningAreaService = new AdvancedService(DiningAreaModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default diningAreaService;
