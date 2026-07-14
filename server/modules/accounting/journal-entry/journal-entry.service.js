// Service layer (BACKEND_FOUNDATION.md §4.3): business rules + orchestration only. This file
// contains zero direct Mongoose calls — every database operation is delegated to
// journal-entry.repository.js, journal-line.repository.js, or accounting-period.repository.js.
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
// route (journal-entry.router.js) is what exposes this method.
import throwError from "../../../utils/throwError.js";
import JournalEntryRepository from "./journal-entry.repository.js";
import JournalLineRepository from "../journal-line/journal-line.repository.js";
import { accountingPeriodRepository } from "../accounting-period/accounting-period.repository.js";
import accountingSettingService from "../accounting-settings/accounting-setting.service.js";

// Extends the repository (rather than composing it) specifically to preserve compatibility with
// BaseController's generic constraint without a deeper framework change — the repository/service
// separation is enforced by convention (this file contains zero raw Mongoose calls; every DB
// operation below is a call to a repository method) rather than by inheritance mechanics
// forbidding it. See REPOSITORY_PATTERN_MIGRATION_PLAN.md for why this is the chosen tradeoff for
// the whole rollout.
const journalLineRepository = new JournalLineRepository();

class JournalEntryService extends JournalEntryRepository {
  async createBalancedEntry(input) {
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
      if (accountingPeriod.isLocked) {
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
        },
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
      const createdLines = await journalLineRepository.createMany(lineDocs, session);

      await session.commitTransaction();

      return { entry, lines: createdLines };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Journal Entry Posting Engine — generic entry point for any source module (Invoice,
   * PurchaseInvoice, SalesReturn, ...) that needs to record an accounting impact. The caller
   * supplies already-resolved `lines` (which accounts, which amounts — that mapping is source-
   * domain business knowledge, e.g. invoice.service.ts knows what a "sales invoice" maps to, this
   * method does not) and this method owns everything generic: resolving the brand's
   * AccountingSettings, resolving the open accounting period for the posting date, generating the
   * entry number, and deciding (from `journalEntry.requireApproval`) whether the entry auto-posts
   * or is created Pending for a maker-checker approval step.
   *
   * Reuses createBalancedEntry() for the actual transactional write — this method's only added
   * responsibility is resolving the inputs createBalancedEntry needs from AccountingSettings/
   * AccountingPeriod instead of requiring the caller to know about either.
   */
  async postFromSource({ sourceType, brand, branch, date, description, lines, createdBy, sourceRef }) {
    const now = date || new Date();

    // V5.2 Workflow Integrity: without this, a retried/duplicate call (a caller re-firing after a
    // timeout, a future event-driven consumer replaying an event) would post the same source
    // document's accounting impact twice — invisible double-accounting, not a loud failure. Every
    // existing caller only reaches this method once per document per TransitionGuard-enforced
    // status change today, so this has never fired in practice, but that protection lived entirely
    // in the *callers*, not here — this closes the gap at the source instead of trusting every
    // future caller to reimplement it correctly.
    if (sourceRef) {
      const alreadyPosted = await journalLineRepository.existsForSource({ brand, sourceType, sourceRef });
      if (alreadyPosted) {
        throwError(
          `A journal entry has already been posted for ${sourceType} ${sourceRef} — refusing to post a duplicate.`,
          409,
        );
      }
    }

    const settings = await accountingSettingService.resolveForPosting(brand, branch);

    const period = await accountingPeriodRepository.findOpenPeriodForDate(brand, now);
    if (!period) {
      throwError(
        `No open accounting period covers ${now.toISOString().slice(0, 10)} — cannot post this ${sourceType}.`,
        422,
      );
    }

    const entryNumber = await accountingSettingService.getNextEntryNumber(settings._id);

    const linesWithSource = lines.map((line) => ({
      ...line,
      sourceType: line.sourceType ?? sourceType,
      sourceRef: line.sourceRef ?? sourceRef ?? null,
    }));

    return this.createBalancedEntry({
      brand,
      branch,
      period: period._id,
      date: now,
      entryNumber,
      description,
      origin: "System",
      baseCurrency: settings.currencySettings?.baseCurrency ?? null,
      lines: linesWithSource,
      createdBy,
      autoPost: !settings.journalEntry?.requireApproval,
      postedBy: createdBy,
    });
  }

  /**
   * Journal Entry Posting Engine — maker-checker approval step. Only legal from Pending (an entry
   * created with autoPost:false because AccountingSettings.journalEntry.requireApproval is true).
   * There is no separate "Approved" status on this schema (see journal-entry.model.js's status
   * enum) — approving IS posting, matching how `approvedBy`/`postedBy` are both set together here
   * rather than as two separate transitions.
   */
  async approveEntry({ id, brand, approvedBy }) {
    const now = new Date();
    const updated = await this.transitionStatus(
      id,
      brand,
      "Pending",
      { status: "Posted", approvedBy, approvedAt: now, postedBy: approvedBy, postedAt: now },
    );

    if (!updated) {
      throwError("Journal entry not found, or is not Pending approval.", 409);
    }

    return updated;
  }

  /** Journal Entry Posting Engine — reject a Pending entry; it will never be posted. */
  async rejectEntry({ id, brand, rejectedBy, reason }) {
    const updated = await this.transitionStatus(
      id,
      brand,
      "Pending",
      { status: "Rejected", rejectedBy, rejectedAt: new Date(), rejectionReason: reason ?? null },
    );

    if (!updated) {
      throwError("Journal entry not found, or is not Pending approval.", 409);
    }

    return updated;
  }

  /**
   * Journal Entry Posting Engine — corrects a Posted entry by creating a new entry with every
   * line's debit/credit swapped (the standard accounting reversal technique — never edit or delete
   * a posted record). Both the new reversal entry and the original entry's status update happen in
   * one transaction: either the correction fully exists (new entry posted + original marked
   * Reversed) or neither change persists.
   */
  async reverseEntry({ id, brand, branch, reversedBy, reason }) {
    const original = await this.findByIdScoped(id, brand, branch);
    if (!original) {
      throwError("Journal entry not found.", 404);
    }
    if (original.status !== "Posted") {
      throwError(`Only Posted entries can be reversed (current status: ${original.status}).`, 409);
    }

    const originalLines = await journalLineRepository.findByJournalEntry(original._id);

    const session = await this.startSession();
    const now = new Date();

    try {
      session.startTransaction();

      const reversalEntry = await this.insertEntry(
        {
          brand: original.brand,
          branch: original.branch,
          period: original.period,
          date: now,
          entryNumber: await accountingSettingService.getNextEntryNumber(
            (await accountingSettingService.resolveForPosting(original.brand, original.branch))._id,
          ),
          description: reason
            ? `Reversal of ${original.entryNumber}: ${reason}`
            : `Reversal of ${original.entryNumber}`,
          totalDebit: original.totalCredit,
          totalCredit: original.totalDebit,
          isBalanced: true,
          baseCurrency: original.baseCurrency,
          origin: "Adjusting",
          status: "Posted",
          reversalOf: original._id,
          createdBy: reversedBy,
          postedBy: reversedBy,
          postedAt: now,
        },
        session,
      );

      const reversalLineDocs = originalLines.map((line) => ({
        journalEntry: reversalEntry._id,
        brand: line.brand,
        branch: line.branch,
        period: line.period,
        date: now,
        description: `Reversal: ${line.description}`,
        account: line.account,
        sourceType: line.sourceType,
        sourceRef: line.sourceRef,
        // The reversal technique: swap debit and credit on every line.
        debit: line.credit,
        credit: line.debit,
        currency: line.currency,
        exchangeRate: line.exchangeRate,
        convertedDebit: line.convertedCredit,
        convertedCredit: line.convertedDebit,
        costCenter: line.costCenter,
      }));

      await journalLineRepository.createMany(reversalLineDocs, session);

      const updatedOriginal = await this.transitionStatus(
        original._id,
        original.brand,
        "Posted",
        { status: "Reversed", reversedBy: reversalEntry._id },
        session,
      );

      if (!updatedOriginal) {
        throwError("Failed to mark the original entry as Reversed (concurrent modification).", 409);
      }

      await session.commitTransaction();

      return { reversalEntry, originalEntry: updatedOriginal };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}

export default new JournalEntryService();
