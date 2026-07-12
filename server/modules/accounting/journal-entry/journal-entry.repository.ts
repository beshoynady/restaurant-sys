// Repository layer (BACKEND_FOUNDATION.md §4.3, decided 2026-07-12): owns ALL database access for
// JournalEntry — generic CRUD (inherited from BaseRepository's Mongoose engine) plus the two
// primitives DB-010's transactional write path needs: opening a session, and inserting a header
// document within one. Deliberately minimal — "database-level transaction helpers only," per the
// mandate; the DECISION of when to open a transaction, what to put in it, and what to do if it
// fails belongs to journal-entry.service.ts, not here.
import mongoose, { type ClientSession } from "mongoose";
import BaseRepository from "../../../utils/BaseRepository.js";
import JournalEntryModel, { type IJournalEntry } from "./journal-entry.model.js";

class JournalEntryRepository extends BaseRepository<IJournalEntry> {
  constructor() {
    super(JournalEntryModel, {
      brandScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "period", "createdBy", "approvedBy", "postedBy", "rejectedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /** Database-level transaction helper only — see class comment. */
  async startSession(): Promise<ClientSession> {
    return mongoose.startSession();
  }

  /** Insert one JournalEntry header document within an existing transaction session. */
  async insertEntry(data: Partial<IJournalEntry>, session: ClientSession): Promise<IJournalEntry> {
    const [entry] = await JournalEntryModel.create([data], { session });
    return entry;
  }
}

export default JournalEntryRepository;
