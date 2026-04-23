import TableModel from "./table.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for table model
const tableService = new AdvancedService(TableModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","diningArea","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default tableService;
