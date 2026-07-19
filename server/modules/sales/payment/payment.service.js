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

    // Idempotent replay: a retried request carrying the same key against the same invoice returns
    // the payment already recorded for it, rather than double-applying — closes ADR-001 §18's G7
    // requirement via the same "unique compound index" idiom used everywhere else in this codebase,
    // not a bespoke header-based mechanism.
    if (idempotencyKey) {
      const existing = await this.model.findOne({ brand, invoice: invoiceId, idempotencyKey }).lean();
      if (existing) return existing;
    }

    // Atomic, race-safe balance draw-down: a MongoDB pipeline update computes the new `status` from
    // the POST-decrement value in the same atomic operation, so no two concurrent payments can ever
    // observe/act on a stale intermediate balance (see ADR-001 Phase-1 plan for the race a plain
    // `$inc` + separate `.save()` would otherwise have). Fails closed (returns null) if the balance
    // doesn't cover this payment or the invoice was concurrently modified.
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
      { new: true },
    );
    if (!invoice) {
      throwError(
        "This payment exceeds the invoice's remaining balance, or the invoice was concurrently modified — reload and retry.",
        409,
      );
    }

    let payment;
    try {
      payment = await this.create({
        brandId: brand,
        branchId: branch,
        createdBy: actorId,
        data: { invoice: invoiceId, cashierShift: cashierShift || null, tenders, totalAmount, idempotencyKey: idempotencyKey || null },
      });
    } catch (err) {
      // The idempotency unique index is the last line of defense against a true concurrent double-
      // submit racing past the read-check above — translate its duplicate-key error into the same
      // "return the existing payment" behavior as the read-check, not a raw 500.
      if (idempotencyKey && err.code === 11000) {
        const existing = await this.model.findOne({ brand, invoice: invoiceId, idempotencyKey }).lean();
        if (existing) return existing;
      }
      throw err;
    }

    // From here on, the financial fact (balance drawn down, Payment recorded) has already
    // unconditionally committed — CashTransaction creation and GL posting are best-effort/non-
    // blocking, matching every other posting call site in this platform (a misconfigured account
    // must not undo a payment that already, correctly, happened).
    const cashTransactionIds = [];
    try {
      for (const tender of tenders) {
        const number = await cashierShiftSettingsService.getNextTransactionNumber(brand, branch);
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
            cashierShift: cashierShift || null,
            status: "POSTED",
            postedAt: new Date(),
            description: `Payment received for Invoice ${invoice.serial}`,
          },
        });
        cashTransactionIds.push(cashTx._id);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[payment.service] CashTransaction(s) not created for payment ${payment._id}: ${err.message}`);
    }

    let journalEntryId = null;
    try {
      const { entry } = await this._postPaymentAccounting({ brand, branch, invoice, totalAmount, tenders, actorId, sourceRef: payment._id });
      journalEntryId = entry?._id ?? null;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[payment.service] Journal entry not posted for payment ${payment._id}: ${err.message}`);
    }

    const update = { cashTransactions: cashTransactionIds, journalEntry: journalEntryId };
    await this.model.updateOne({ _id: payment._id }, { $set: update });

    return { ...(payment.toObject ? payment.toObject() : payment), ...update };
  }

  /**
   * Debit Cash-or-Card-Clearing / Credit Accounts Receivable — the settlement leg Phase 0 left
   * pending. `sourceRef: payment._id` (not the invoice's own _id) mirrors PurchaseInvoice's proven
   * per-payment sourceRef pattern exactly, so each of an invoice's several partial payments posts
   * its own independent, idempotent entry.
   */
  async _postPaymentAccounting({ brand, branch, invoice, totalAmount, tenders, actorId, sourceRef }) {
    const settings = await accountingSettingService.resolveForPosting(brand, branch);
    const currency = settings.currencySettings?.baseCurrency || "EGP";
    const accountsReceivable = settings.controlAccounts?.accountsReceivable;
    if (!accountsReceivable) return {};

    const description = `Payment received for Invoice ${invoice.serial}`;
    const cashAccount = await this._resolveCashAccount(tenders, settings);
    if (!cashAccount) return {};

    const lines = [
      journalLine(cashAccount, description, totalAmount, 0, currency),
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
    });
  }

  /**
   * Prefers a tender-supplied CashRegister's own GL account (the accurate answer — a payment
   * settled through a specific POS drawer vs. the branch safe are different accounts); falls back
   * to the brand's generic controlAccounts.cash otherwise. Same fallback resolution
   * PurchaseInvoice._resolveCashAccount already uses on the Purchasing side.
   */
  async _resolveCashAccount(tenders, settings) {
    const registerId = tenders.find((t) => t.cashRegister)?.cashRegister;
    if (registerId) {
      const register = await CashRegisterModel.findById(registerId).select("accountId").lean();
      if (register?.accountId) return register.accountId;
    }
    return settings.controlAccounts?.cash;
  }
}

export default new PaymentService();
