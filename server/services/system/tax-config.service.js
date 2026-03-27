import TaxConfigModel from "../../models/system/tax-config.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for tax-config model
const taxConfigService = new AdvancedCrudService(TaxConfigModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","vatReceivableAccount","vatPayableAccount"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default taxConfigService;
