import PreparationTicketModel from "./preparation-ticket.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";

// PLATFORM_FINAL_AUDIT.md PA-07: preparationStatus/deliveryStatus were raw
// enum fields updated through the generic BaseController.update with no
// transition guard — any client could set any status from any status.
// Guarded here, mirroring the pattern already established for
// LeaveRequest/EmployeeAdvance in the HR domain.
const PREPARATION_STATUS_TRANSITIONS = {
  PENDING: ["PREPARING", "CANCELLED", "REJECTED"],
  PREPARING: ["READY", "CANCELLED", "REJECTED"],
  READY: [],
  CANCELLED: [],
  REJECTED: [],
};

const DELIVERY_STATUS_TRANSITIONS = {
  WAITING: ["READY_FOR_HANDOVER"],
  READY_FOR_HANDOVER: ["HANDED_OVER"],
  HANDED_OVER: [],
};

class PreparationTicketService extends AdvancedService {
  constructor() {
    super(PreparationTicketModel, {
      brandScoped: true,
      // PLATFORM_FINAL_AUDIT.md PA-07, corrected: transactional execution
      // record with its own preparationStatus/deliveryStatus lifecycle
      // (guarded in update() below) — soft-delete does not apply.
      enableSoftDelete: false,
      defaultPopulate: ["brand","branch","order","preparationSection","responsibleEmployee","waiter","createdBy","updatedBy"],
      searchFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  async update(opts) {
    const { id, data } = opts;

    if (data?.preparationStatus || data?.deliveryStatus) {
      const current = await this.model.findById(id).select("preparationStatus deliveryStatus").lean();
      if (!current) {
        throwError("Resource not found", 404);
      }

      if (data.preparationStatus && data.preparationStatus !== current.preparationStatus) {
        const allowed = PREPARATION_STATUS_TRANSITIONS[current.preparationStatus] || [];
        if (!allowed.includes(data.preparationStatus)) {
          throwError(
            `Invalid preparationStatus transition: ${current.preparationStatus} -> ${data.preparationStatus}`,
            400,
          );
        }
      }

      if (data.deliveryStatus && data.deliveryStatus !== current.deliveryStatus) {
        const allowed = DELIVERY_STATUS_TRANSITIONS[current.deliveryStatus] || [];
        if (!allowed.includes(data.deliveryStatus)) {
          throwError(
            `Invalid deliveryStatus transition: ${current.deliveryStatus} -> ${data.deliveryStatus}`,
            400,
          );
        }
      }
    }

    return super.update(opts);
  }
}

export default new PreparationTicketService();
