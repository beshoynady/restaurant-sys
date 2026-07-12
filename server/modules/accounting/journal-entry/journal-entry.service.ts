// Service layer (BACKEND_FOUNDATION.md §4.3): business rules + orchestration only. This file
// contains zero direct Mongoose calls — every database operation is delegated to
// journal-entry.repository.ts, journal-line.repository.ts, or accounting-period.repository.ts.
// What stayed here on purpose: deciding *whether* an entry balances (a business rule), deciding
// *when* to open/commit/abort a transaction (orchestration), and composing three different
// modules' repositories into one atomic operation (cross-module integration) — all explicitly
// Service-layer responsibilities per §4.3, none of them Repository ones.
//
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
// `.session(session)` via accountingPeriodRepository, so it observes a consistent snapshot with the
// writes that follow it) rather than as a duplicate schema-level hook on JournalLine: JournalLine's
// only write path is this method, so a second lookup per line would be a real per-line DB
// round-trip cost for no additional protection the entry-level check doesn't already provide.
//
// This is a NEW method alongside the existing generic CRUD (`journalEntryService.create` still
// works exactly as before, for callers that only need a header with no lines) — the existing
// `POST /journal-entries` route and its behavior are unchanged; a new `POST /journal-entries/post`
// route (journal-entry.router.ts) is what exposes this method.
import throwErrorJs from "../../../utils/throwError.js";
import JournalEntryRepository from "./journal-entry.repository.js";
import { type IJournalEntry, type JournalEntryOrigin } from "./journal-entry.model.js";
import JournalLineRepository from "../journal-line/journal-line.repository.js";
import { type JournalLineSourceType } from "../journal-line/journal-line.model.js";
import { accountingPeriodRepository } from "../accounting-period/accounting-period.repository.js";

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

// Extends the repository (rather than composing it) specifically to preserve compatibility with
// BaseController's existing generic constraint (`TService extends BaseService<any>`) without a
// deeper framework change — the repository/service separation is enforced by convention (this
// file contains zero raw Mongoose calls; every DB operation below is a call to a repository
// method) rather than by TypeScript's inheritance mechanics forbidding it. See
// REPOSITORY_PATTERN_MIGRATION_PLAN.md for why this is the chosen tradeoff for the whole rollout.
const journalLineRepository = new JournalLineRepository();

class JournalEntryService extends JournalEntryRepository {
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

    // Business rule: an entry must balance. Checked before opening a session — rejecting an
    // obviously-unbalanced request avoids the cost of a transaction for the common
    // "client sent bad data" case; checked again implicitly by construction below (the totals
    // written to the entry are computed from these same lines, so a later re-check would be
    // redundant, not additionally protective).
    const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
    if (totalDebit !== totalCredit) {
      throwError(
        `Journal entry is not balanced: totalDebit (${totalDebit}) !== totalCredit (${totalCredit}).`,
        400,
      );
    }

    const session = await this.startSession();
    const now = new Date();
    const entryDate = date || now;

    try {
      session.startTransaction();

      // Business rule (DB-014): reject writes to a locked accounting period. Read inside the
      // transaction's snapshot via the repository, so a concurrent lock/unlock cannot race between
      // this check and the writes that follow it.
      const accountingPeriod = await accountingPeriodRepository.findLockStatus(period, session);

      if (!accountingPeriod) {
        throwError("Accounting period not found.", 404);
      }
      // Non-null: throwError() above throws synchronously — asserted rather than relying on
      // cross-boundary narrowing of the imported `.js` `never`-return type.
      if (accountingPeriod!.isLocked) {
        throwError("Cannot write a journal entry to a locked accounting period.", 423);
      }

      const entry = await this.insertEntry(
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
        } as unknown as Partial<IJournalEntry>,
        session,
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
      const createdLines = await journalLineRepository.createMany(
        lineDocs as unknown as Parameters<typeof journalLineRepository.createMany>[0],
        session,
      );

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
