// Repository layer (BACKEND_FOUNDATION.md §4.3, decided 2026-07-12): owns ALL database access for
// JournalLine — generic CRUD (inherited from BaseRepository's Mongoose engine: pagination,
// populate, bulk ops, soft-delete-aware queries) plus the two custom query methods DB-010's
// transactional write path needs. No business rules, no validation beyond schema-level, no
// workflow logic — see journal-line.service.ts for that.
import type { ClientSession } from "mongoose";
import BaseRepository from "../../../utils/BaseRepository.js";
import JournalLineModel, { type IJournalLine } from "./journal-line.model.js";

class JournalLineRepository extends BaseRepository<IJournalLine> {
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
  async createMany(
    docs: Array<Partial<IJournalLine>>,
    session: ClientSession,
  ): Promise<IJournalLine[]> {
    return JournalLineModel.create(docs, { session }) as unknown as Promise<IJournalLine[]>;
  }

  /** All lines belonging to one journal entry (used by ledger/reporting consumers). */
  async findByJournalEntry(journalEntryId: string): Promise<IJournalLine[]> {
    return this.model.find({ journalEntry: journalEntryId });
  }
}

export default JournalLineRepository;
