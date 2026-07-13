// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access for Shift —
// generic CRUD (inherited from BaseRepository) plus custom queries this module needs.
// Previously this module had no repository file at all — shift.service.js instantiated
// BaseRepository directly, violating the mandatory Repository Pattern.
import BaseRepository from "../../../utils/BaseRepository.js";
import { multilingualSearchableFields } from "../../../utils/multilingualSearch.js";
import ShiftModel from "./shift.model.js";

class ShiftRepository extends BaseRepository {
  constructor() {
    super(ShiftModel, {
      brandScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "createdBy", "updatedBy", "deletedBy"],
      // `status`/`shiftType` removed from free-text search — they're short
      // enum values, already exposed as exact-match query filters
      // (queryShiftSchema), which is the correct tool for filtering by
      // them; fuzzy-regex-matching an enum value is the wrong mechanism.
      searchableFields: ["code", ...multilingualSearchableFields("name")],
      defaultSort: { createdAt: -1 },
    });
  }
}

export default ShiftRepository;
