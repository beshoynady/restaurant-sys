import PreparationReturnModel from "./preparation-return.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";

// PLATFORM_FINAL_AUDIT.md PA-07: same missing status-transition guard as
// preparation-ticket.service.js.
const STATUS_TRANSITIONS = {
  PENDING: ["IN_REVIEW", "CANCELLED"],
  IN_REVIEW: ["FINALIZED", "CANCELLED"],
  FINALIZED: [],
  CANCELLED: [],
};

class PreparationReturnService extends AdvancedService {
  constructor() {
    super(PreparationReturnModel, {
      brandScoped: true,
      // PLATFORM_FINAL_AUDIT.md PA-07, corrected: transactional record with
      // its own status lifecycle (guarded in update() below) — soft-delete
      // does not apply.
      enableSoftDelete: false,
      defaultPopulate: ["brand","branch","returnInvoice","preparationSection","responsibleEmployee","waiter","createdBy","updatedBy"],
      searchFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  async update(opts) {
    const { id, data } = opts;

    if (data?.status) {
      const current = await this.model.findById(id).select("status").lean();
      if (!current) {
        throwError("Resource not found", 404);
      }

      if (data.status !== current.status) {
        const allowed = STATUS_TRANSITIONS[current.status] || [];
        if (!allowed.includes(data.status)) {
          throwError(`Invalid status transition: ${current.status} -> ${data.status}`, 400);
        }
      }
    }

    return super.update(opts);
  }
}

export default new PreparationReturnService();
