import SalesReturnSettingsModel from "../../models/sales/sales-return-settings.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for sales-return-settings model
const salesReturnSettingsService = new AdvancedCrudService(SalesReturnSettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","decisionBy","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default salesReturnSettingsService;
