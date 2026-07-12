// Converted to TypeScript as part of DATABASE_IMPLEMENTATION_PLAN.md DB-010 (this model is now
// directly consumed by journal-entry.service.ts's transactional creation path). JournalLine has no
// soft-delete fields (it is an append-only ledger line, per DATABASE_ARCHITECTURE_REDESIGN.md) —
// `enableSoftDelete` corrected to `false` to match the actual schema shape (was previously passed
// as `softDelete: true`, a key name BaseServiceOptions doesn't recognize at all, so it was already
// silently a no-op).
import BaseService from "../../../utils/BaseService.js";
import JournalLineModel, { type IJournalLine } from "./journal-line.model.js";

class JournalLineService extends BaseService<IJournalLine> {
  constructor() {
    super(JournalLineModel, {
      brandScoped: true,
      enableSoftDelete: false,
      defaultPopulate: ["brand", "branch", "account", "costCenter", "journalEntry"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }
}

export default new JournalLineService();
