import ShiftModel from "./shift.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

// Initialize service for shift model
const shiftService = new AdvancedService(ShiftModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default shiftService;
