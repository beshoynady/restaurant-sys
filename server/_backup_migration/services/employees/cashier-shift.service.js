import CashierShiftModel from "../../models/employees/cashier-shift.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for cashier-shift model
const cashierShiftService = new AdvancedService(CashierShiftModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","cashier","register","attendanceRecord","variance.approvedBy","cashAccount","journalEntry","openedBy","closedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default cashierShiftService;
