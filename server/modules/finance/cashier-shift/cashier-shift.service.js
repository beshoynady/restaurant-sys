import CashierShiftModel from "./cashier-shift.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for cashier-shift model
const cashierShiftService = new AdvancedService(CashierShiftModel, {
  brandScoped: true,
  // PLATFORM_FINAL_AUDIT.md PA-02, corrected: transactional document
  // (OPEN/COUNTED/CLOSED/POSTED/CANCELLED lifecycle) — see
  // cash-transaction.service.js.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","cashier","register","attendanceRecord","variance.approvedBy","cashAccount","journalEntry","openedBy","closedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default cashierShiftService;
