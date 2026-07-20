// Service layer — ADR-001-SALES-PAYMENT-ARCHITECTURE.md Phase 1. Business orchestration only;
// data access for Payment's own model is inherited from payment.repository.js (same directory).
// Cross-domain model reads (Invoice, CashRegister) mirror the existing, accepted pattern already
// used by inventory/recipe-consumption.service.js and sales/order.service.js, not a new precedent.
import PaymentRepository from "./payment.repository.js";
import throwError from "../../../utils/throwError.js";
import InvoiceModel from "../invoice/invoice.model.js";
import CashRegisterModel from "../../finance/cash-register/cash-register.model.js";
import cashTransactionService from "../../finance/cash-transaction/cash-transaction.service.js";
import cashierShiftSettingsService from "../../finance/cashier-shift-settings/cashier-shift-settings.service.js";
import accountingSettingService from "../../accounting/accounting-settings/accounting-setting.service.js";
import journalEntryService from "../../accounting/journal-entry/journal-entry.service.js";

function journalLine(account, description, debit, credit, currency) {
  return { account, description, debit, credit, currency };
}

class PaymentService extends PaymentRepository {
  /**
   * The Phase-1 entry point — mirrors PurchaseInvoice.recordPayment()'s proven shape on the
   * Sales/AR side. NOT routed through the generic create()/beforeCreate() flow: this needs to act
   * both before the Payment document exists (claim the invoice balance) and after (CashTransaction/
   * JournalEntry need the Payment's own _id), which a single beforeCreate hook can't express.
   */
  async recordPayment({ brand, branch, invoice: invoiceId, tenders, cashierShift, idempotencyKey, actorId }) {
    if (!Array.isArray(tenders) || tenders.length === 0) {
      throwError("At least one tender is required to record a payment.", 400);
    }
    const totalAmount = tenders.reduce((sum, t) => sum + (t.amount || 0), 0);
    if (totalAmount <= 0) {
      throwError("Payment total must be greater than zero.", 400);
    }

    // Cheap pre-check outside any transaction: the overwhelmingly common case is a client retry
    // with a key that's already fully recorded and committed — no need to pay for a transaction
    // at all for that case.
    if (idempotencyKey) {
      const existing = await this.model.findOne({ brand, invoice: invoiceId, idempotencyKey }).lean();
      if (existing) return existing;
    }

    // ADR-001 (platform architecture decision): every multi-document financial operation runs
    // inside a single MongoDB transaction. Invoice balance draw-down, Payment creation, each
    // tender's CashTransaction, and the SALES_PAYMENT_RECEIPT JournalEntry either all commit
    // together or none of them do — a failure at any step (insufficient balance, a misconfigured
    // GL account, a bad tender, a DB error) aborts everything already written in this attempt.
    try {
      return await this.withTransaction(async (session) => {
        // Re-check idempotency INSIDE the transaction (session-scoped read), not just before it:
        // two truly simultaneous requests with the same key can both pass the pre-check above
        // before either has committed. The loser's write to the invoice document below then
        // collides with the winner's uncommitted write and MongoDB reports a WriteConflict
        // (TransientTransactionError), which BaseRepository#withTransaction retries — and on retry
        // this check now sees the winner's already-committed Payment and returns it directly,
        // rather than blindly re-attempting (and failing) the balance decrement a second time.
        if (idempotencyKey) {
          const existing = await this.model.findOne({ brand, invoice: invoiceId, idempotencyKey }).session(session).lean();
          if (existing) return existing;
        }

        // Atomic, race-safe balance draw-down: a MongoDB pipeline update computes the new `status`
        // from the POST-decrement value in the same atomic operation, so no two concurrent payments
        // can ever observe/act on a stale intermediate balance. Fails closed (returns null) if the
        // balance doesn't cover this payment or the invoice was concurrently modified.
        const invoice = await InvoiceModel.findOneAndUpdate(
          { _id: invoiceId, brand, branch, balanceDue: { $gte: totalAmount } },
          [
            {
              $set: {
                amountPaid: { $add: ["$amountPaid", totalAmount] },
                balanceDue: { $subtract: ["$balanceDue", totalAmount] },
              },
            },
            {
              $set: {
                status: { $cond: [{ $lte: ["$balanceDue", 0] }, "PAID", "PARTIALLY_PAID"] },
              },
            },
          ],
          { new: true, session },
        );
        if (!invoice) {
          throwError(
            "This payment exceeds the invoice's remaining balance, or the invoice was concurrently modified — reload and retry.",
            409,
          );
        }

        const payment = await this.create({
          brandId: brand,
          branchId: branch,
          createdBy: actorId,
          data: { invoice: invoiceId, cashierShift: cashierShift || null, tenders, totalAmount, idempotencyKey: idempotencyKey || null },
          session,
        });

        const cashTransactionIds = [];
        for (const tender of tenders) {
          const number = await cashierShiftSettingsService.getNextTransactionNumber(brand, branch, session);
          const cashTx = await cashTransactionService.create({
            brandId: brand,
            branchId: branch,
            createdBy: actorId,
            data: {
              branch,
              number,
              date: new Date(),
              transactionType: "SALE",
              direction: "INFLOW",
              amount: tender.amount,
              currency: tender.currency || "EGP",
              paymentMethod: tender.paymentMethod,
              externalReference: tender.reference || null,
              invoiceId,
              cashRegister: tender.cashRegister || null,
              cashierShift: cashierShift || null,
              status: "POSTED",
              postedAt: new Date(),
              description: `Payment received for Invoice ${invoice.serial}`,
            },
            session,
          });
          cashTransactionIds.push(cashTx._id);
        }

        const { entry } = await this._postPaymentAccounting({
          brand, branch, invoice, totalAmount, tenders, actorId, sourceRef: payment._id, session,
        });

        const update = { cashTransactions: cashTransactionIds, journalEntry: entry._id };
        await this.model.updateOne({ _id: payment._id }, { $set: update }, { session });

        return { ...(payment.toObject ? payment.toObject() : payment), ...update };
      });
    } catch (err) {
      if (idempotencyKey && err.code === 11000) {
        const existing = await this.model.findOne({ brand, invoice: invoiceId, idempotencyKey }).lean();
        if (existing) return existing;
      }
      throw err;
    }
  }

  /**
   * Debit Cash-or-Card-Clearing / Credit Accounts Receivable — the settlement leg Phase 0 left
   * pending. `sourceRef: payment._id` (not the invoice's own _id) mirrors PurchaseInvoice's proven
   * per-payment sourceRef pattern exactly, so each of an invoice's several partial payments posts
   * its own independent, idempotent entry.
   *
   * Each tender is resolved to its own cash/card account and posted as its own debit line — a
   * split-tender payment across two different cash registers must not collapse onto a single
   * account debited for the full amount.
   *
   * Runs inside the caller's transaction (`session`): a posting configuration gap (no AR control
   * account, no resolvable cash account) now THROWS rather than silently skipping the journal
   * entry — under the transactional model this must abort and roll back the whole payment, not
   * leave a Payment/CashTransaction recorded with no accounting impact.
   */
  async _postPaymentAccounting({ brand, branch, invoice, totalAmount, tenders, actorId, sourceRef, session }) {
    const settings = await accountingSettingService.resolveForPosting(brand, branch, session);
    const currency = settings.currencySettings?.baseCurrency || "EGP";
    const accountsReceivable = settings.controlAccounts?.accountsReceivable;
    if (!accountsReceivable) {
      throwError(
        "AccountingSettings has no controlAccounts.accountsReceivable configured — cannot post this payment.",
        422,
      );
    }

    const description = `Payment received for Invoice ${invoice.serial}`;

    const amountByAccount = new Map();
    for (const tender of tenders) {
      const account = await this._resolveCashAccount(tender, settings, brand, branch, session);
      if (!account) {
        throwError(
          "No cash/card GL account could be resolved for one of this payment's tenders — cannot post this payment.",
          422,
        );
      }
      const key = account.toString();
      amountByAccount.set(key, (amountByAccount.get(key) || 0) + (tender.amount || 0));
    }

    const lines = [
      ...Array.from(amountByAccount, ([account, amount]) => journalLine(account, description, amount, 0, currency)),
      journalLine(accountsReceivable, description, 0, totalAmount, currency),
    ];

    return journalEntryService.postFromSource({
      sourceType: "SALES_PAYMENT_RECEIPT",
      brand,
      branch,
      date: new Date(),
      description,
      lines,
      createdBy: actorId,
      sourceRef,
      session,
    });
  }

  /**
   * Prefers this tender's own CashRegister GL account (the accurate answer — a payment settled
   * through a specific POS drawer vs. the branch safe are different accounts); falls back to the
   * brand's generic controlAccounts.cash otherwise. Same fallback resolution
   * PurchaseInvoice._resolveCashAccount already uses on the Purchasing side. The register lookup is
   * scoped to the current brand/branch so a caller-supplied register from another tenant can never
   * resolve to a foreign GL account.
   */
  async _resolveCashAccount(tender, settings, brand, branch, session) {
    if (tender.cashRegister) {
      // branch: null on CashRegister means brand-wide (e.g. a SAFE/SUSPENSE register) — a register
      // scoped to a specific branch must still match this payment's branch exactly.
      const register = await CashRegisterModel.findOne({ _id: tender.cashRegister, brand, $or: [{ branch: null }, { branch }] })
        .session(session)
        .select("accountId")
        .lean();
      if (register?.accountId) return register.accountId;
    }
    return settings.controlAccounts?.cash;
  }
}

export default new PaymentService();
