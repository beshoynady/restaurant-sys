import ShiftModel from "./shift.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

/**
 * Shift Service
 * Notes (EN):
 * - Uses BaseRepository to provide: brand scoping, pagination, soft delete, populate, search & filters.
 * - Search uses MongoDB regex against `searchableFields`.
 * - `name` is stored as a multilang Map => search via dot-notation (name.EN / name.AR).
 */
const shiftService = new AdvancedService(ShiftModel, {
  brandScoped: true,
  enableSoftDelete: true,

  defaultPopulate: [
    "brand",
    "branch",
    "createdBy",
    "updatedBy",
    "deletedBy",
  ],

  // EN: search fields for BaseRepository (regex on MongoDB)
  searchableFields: [
    "code",
    "status",
    "shiftType",
    "name.EN",
    "name.AR",
  ],

  defaultSort: { createdAt: -1 },
});

export default shiftService;
