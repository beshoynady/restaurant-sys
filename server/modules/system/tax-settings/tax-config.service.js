import TaxConfigModel from "./tax-config.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for tax-config model
const taxConfigService = new AdvancedService(TaxConfigModel, {
  brandScoped: true,
  branchScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","vatReceivableAccount","vatPayableAccount"],
  searchableFields: [],
  defaultSort: { createdAt: -1 },
});

export default taxConfigService;
