import CashRegisterModel from "../../models/cash/cash-register.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for cash-register model
const cashRegisterService = new AdvancedService(CashRegisterModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","employee","accountId","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default cashRegisterService;
