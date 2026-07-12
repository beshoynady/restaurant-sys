// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access for
// JournalEntry — generic CRUD + `startSession()` (inherited from BaseRepository's Mongoose
// engine) plus the one extra primitive DB-010's transactional write path needs: inserting a
// header document within an existing session. Deliberately minimal — "database-level transaction
// helpers only," per the mandate; the DECISION of when to open a transaction, what to put in it,
// and what to do if it fails belongs to journal-entry.service.js, not here.
import BaseRepository from "../../../utils/BaseRepository.js";
import JournalEntryModel from "./journal-entry.model.js";

class JournalEntryRepository extends BaseRepository {
  constructor() {
    super(JournalEntryModel, {
      brandScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "period", "createdBy", "approvedBy", "postedBy", "rejectedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /** Insert one JournalEntry header document within an existing transaction session. */
  async insertEntry(data, session) {
    const [entry] = await JournalEntryModel.create([data], { session });
    return entry;
  }
}

export default JournalEntryRepository;
