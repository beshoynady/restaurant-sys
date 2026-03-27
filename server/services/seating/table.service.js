import TableModel from "../../models/seating/table.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for table model
const tableService = new AdvancedCrudService(TableModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","diningArea","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default tableService;
