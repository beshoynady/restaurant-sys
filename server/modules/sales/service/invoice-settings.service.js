import InvoiceSettingsModel from "../../models/sales/invoice-settings.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for invoice-settings model
const invoiceSettingsService = new AdvancedService(InvoiceSettingsModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default invoiceSettingsService;
