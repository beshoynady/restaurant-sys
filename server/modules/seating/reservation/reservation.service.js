import ReservationModel from "./reservation.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";

// PLATFORM_FINAL_AUDIT.md PA-08: reservation creation had no double-booking
// check at all — the {table,startTime,endTime} index (reservation.model.js)
// exists for query speed only, not uniqueness/overlap enforcement. A
// reservation only actually holds the table while it is in one of these
// statuses; cancelled/no_show/completed reservations must not block a new
// booking for the same slot.
const BLOCKING_STATUSES = ["pending", "confirmed", "seated"];

class ReservationService extends AdvancedService {
  constructor() {
    super(ReservationModel, {
      brandScoped: true,
      // PLATFORM_FINAL_AUDIT.md PA-08, corrected: transactional booking
      // record, already has a full lifecycle status — see reservation.model.js.
      enableSoftDelete: false,
      defaultPopulate: ["brand","branch","table","customer","user","linkedOrder","createdBy","updatedBy","cancelledBy"],
      searchFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  async assertNoOverlap({ table, startTime, endTime, brand, excludeId = null }) {
    const query = {
      table,
      brand,
      status: { $in: BLOCKING_STATUSES },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const conflict = await this.model.findOne(query).select("_id").lean();
    if (conflict) {
      throwError("This table is already reserved for an overlapping time window.", 409);
    }
  }

  async beforeCreate(data) {
    if (data.table && data.startTime && data.endTime) {
      await this.assertNoOverlap({
        table: data.table,
        startTime: data.startTime,
        endTime: data.endTime,
        brand: data.brand,
      });
    }
    return data;
  }

  async update(opts) {
    const { id, data } = opts;

    if (data?.table || data?.startTime || data?.endTime) {
      const current = await this.model.findById(id).select("table startTime endTime brand").lean();
      if (!current) {
        throwError("Resource not found", 404);
      }

      await this.assertNoOverlap({
        table: data.table ?? current.table,
        startTime: data.startTime ?? current.startTime,
        endTime: data.endTime ?? current.endTime,
        brand: current.brand,
        excludeId: id,
      });
    }

    return super.update(opts);
  }
}

export default new ReservationService();
