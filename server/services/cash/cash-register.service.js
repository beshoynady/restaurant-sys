import CashRegisterModel from "../../models/cash/cash-register.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for cash-register model
const cashRegisterService = new AdvancedCrudService(CashRegisterModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","employee","accountId","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default cashRegisterService;
