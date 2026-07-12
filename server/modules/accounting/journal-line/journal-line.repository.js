// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access for
// JournalLine — generic CRUD (inherited from BaseRepository's Mongoose engine: pagination,
// populate, bulk ops, soft-delete-aware queries) plus the two custom query methods DB-010's
// transactional write path needs. No business rules, no validation beyond schema-level, no
// workflow logic — see journal-line.service.js for that.
import BaseRepository from "../../../utils/BaseRepository.js";
import JournalLineModel from "./journal-line.model.js";

class JournalLineRepository extends BaseRepository {
  constructor() {
    super(JournalLineModel, {
      brandScoped: true,
      enableSoftDelete: false,
      defaultPopulate: ["brand", "branch", "account", "costCenter", "journalEntry"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /** DB-010: bulk-insert lines within an existing transaction session. */
  async createMany(docs, session) {
    return JournalLineModel.create(docs, { session });
  }

  /** All lines belonging to one journal entry (used by ledger/reporting consumers). */
  async findByJournalEntry(journalEntryId) {
    return this.model.find({ journalEntry: journalEntryId });
  }
}

export default JournalLineRepository;
