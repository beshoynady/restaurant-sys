import ShiftModel from "../../models/employees/shift.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for shift model
const shiftService = new AdvancedCrudService(ShiftModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default shiftService;
