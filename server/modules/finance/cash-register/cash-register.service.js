import CashRegisterModel from "./cash-register.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for cash-register model
const cashRegisterService = new AdvancedService(CashRegisterModel, {
  brandScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","employee","accountId","createdBy","updatedBy","deletedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
  // `balance` is documented on the model itself as the register's running cash position — the
  // same "derived, system-owned figure" class as AccountBalance/Order.status, previously freely
  // writable via generic PUT with nothing else in the codebase treating it as authoritative. Once
  // a cash-transaction/shift-close posting engine exists it becomes the only writer; until then
  // this prevents drift from a client-supplied value with no relationship to actual movements.
  lockedUpdateFields: ["balance"],
});

export default cashRegisterService;
