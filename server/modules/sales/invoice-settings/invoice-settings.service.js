import InvoiceSettingsModel from "./invoice-settings.model.js";
import AdvancedService from "../../../utils/BaseService.js";

// Initialize service for invoice-settings model
const invoiceSettingsService = new AdvancedService(InvoiceSettingsModel, {
  brandScoped: true,
  branchScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy"],
  searchableFields: [],
  defaultSort: { createdAt: -1 },
});

export default invoiceSettingsService;
