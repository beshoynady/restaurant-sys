import CashRegisterModel from "./cash-register.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for cash-register model
const cashRegisterService = new AdvancedService(CashRegisterModel, {
  brandScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","employee","accountId","createdBy","updatedBy","deletedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default cashRegisterService;
