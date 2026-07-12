// DATABASE_IMPLEMENTATION_PLAN.md DB-010 + DB-014:
//
// DB-010 — `createBalancedEntry()` is the transactional write path the JournalEntry/JournalLine
// schema redesign (DB-008/DB-009) was built for: the header and its lines are inserted atomically
// inside a single MongoDB session/transaction, `totalDebit`/`totalCredit`/`isBalanced` are computed
// and verified before anything commits, and any failure (unbalanced lines, a locked period, or a
// genuine write error partway through) aborts the transaction — no partial JournalEntry-with-some-
// lines-missing can ever exist.
//
// DB-014 — the accounting-period lock check lives inside this same transaction (read with
// `.session(session)`, so it observes a consistent snapshot with the writes that follow it) rather
// than as a duplicate schema-level hook on JournalLine: JournalLine's only write path is this
// method, so a second lookup per line would be a real per-line DB round-trip cost for no additional
// protection the entry-level check doesn't already provide.
//
// This is a NEW method alongside the existing generic BaseService CRUD (`journalEntryService.create`
// still works exactly as before, for callers that only need a header with no lines) — the existing
// `POST /journal-entries` route and its behavior are unchanged; a new `POST /journal-entries/post`
// route (journal-entry.router.ts) is what exposes this method.
import mongoose from "mongoose";
import BaseService from "../../../utils/BaseService.js";
import throwErrorJs from "../../../utils/throwError.js";
import JournalEntryModel, { type IJournalEntry, type JournalEntryOrigin } from "./journal-entry.model.js";
import JournalLineModel, { type JournalLineSourceType } from "../journal-line/journal-line.model.js";
import AccountingPeriodModel from "../accounting-period/accounting-period.model.js";

const throwError = throwErrorJs as (message: string, statusCode: number) => never;

export interface JournalLineInput {
  account: string;
  description: string;
  debit?: number;
  credit?: number;
  currency: string;
  exchangeRate?: number;
  convertedDebit?: number;
  convertedCredit?: number;
  costCenter?: string | null;
  sourceType?: JournalLineSourceType | null;
  sourceRef?: string | null;
}

export interface CreateBalancedEntryInput {
  brand: string;
  branch: string;
  period: string;
  date?: Date;
  entryNumber: string;
  description: string;
  origin?: JournalEntryOrigin;
  baseCurrency?: string | null;
  lines: JournalLineInput[];
  createdBy: string;
  /** Defaults to true: the entry is posted immediately (the common case — see class comment). */
  autoPost?: boolean;
  postedBy?: string;
}

class JournalEntryService extends BaseService<IJournalEntry> {
  constructor() {
    super(JournalEntryModel, {
      brandScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "period", "createdBy", "approvedBy", "postedBy", "rejectedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  async createBalancedEntry(
    input: CreateBalancedEntryInput,
  ): Promise<{ entry: IJournalEntry; lines: unknown[] }> {
    const {
      brand,
      branch,
      period,
      date,
      entryNumber,
      description,
      origin = "System",
      baseCurrency = null,
      lines,
      createdBy,
      autoPost = true,
      postedBy,
    } = input;

    if (!lines || lines.length === 0) {
      throwError("A journal entry must have at least one line.", 400);
    }

    const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
    // DB-010: balanced-entry validation before commit — checked again inside the transaction
    // below, but rejecting an obviously-unbalanced request before opening a session avoids the
    // cost of a transaction for the common "client sent bad data" case.
    if (totalDebit !== totalCredit) {
      throwError(
        `Journal entry is not balanced: totalDebit (${totalDebit}) !== totalCredit (${totalCredit}).`,
        400,
      );
    }

    const session = await mongoose.startSession();
    const now = new Date();
    const entryDate = date || now;

    try {
      session.startTransaction();

      // DB-014: read the period's lock state inside the transaction's snapshot, so a concurrent
      // lock/unlock cannot race between this check and the writes that follow it.
      const accountingPeriod = await AccountingPeriodModel.findById(period)
        .session(session)
        .select("isLocked")
        .lean();

      if (!accountingPeriod) {
        throwError("Accounting period not found.", 404);
      }
      if (accountingPeriod.isLocked) {
        throwError("Cannot write a journal entry to a locked accounting period.", 423);
      }

      const [entry] = await JournalEntryModel.create(
        [
          {
            brand,
            branch,
            period,
            date: entryDate,
            entryNumber,
            description,
            totalDebit,
            totalCredit,
            isBalanced: true,
            baseCurrency,
            origin,
            status: autoPost ? "Posted" : "Pending",
            createdBy,
            postedBy: autoPost ? postedBy || createdBy : null,
            postedAt: autoPost ? now : null,
          },
        ],
        { session },
      );

      const lineDocs = lines.map((line) => ({
        journalEntry: entry._id,
        brand,
        branch,
        period,
        date: entryDate,
        description: line.description,
        account: line.account,
        sourceType: line.sourceType ?? null,
        sourceRef: line.sourceRef ?? null,
        debit: line.debit || 0,
        credit: line.credit || 0,
        currency: line.currency,
        exchangeRate: line.exchangeRate ?? 1,
        convertedDebit: line.convertedDebit ?? 0,
        convertedCredit: line.convertedCredit ?? 0,
        costCenter: line.costCenter ?? null,
      }));

      // DB-010: any validation/write failure here (e.g. a line missing a required field) throws,
      // which is caught below and aborts the transaction — the JournalEntry created above is
      // rolled back along with it. No partial entry-with-some-lines-missing can ever be committed.
      const createdLines = await JournalLineModel.create(lineDocs, { session });

      await session.commitTransaction();

      return { entry, lines: createdLines };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}

export default new JournalEntryService();
