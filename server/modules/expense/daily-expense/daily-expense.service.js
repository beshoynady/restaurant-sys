import DailyExpenseModel from "./daily-expense.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";
import expenseSettingsService from "../expense-settings/expense-settings.service.js";
import ExpenseModel from "../expense/expense.model.js";
import CashRegisterModel from "../../finance/cash-register/cash-register.model.js";
import BankAccountModel from "../../finance/bank-account/bank-account.model.js";
import accountingSettingService from "../../accounting/accounting-settings/accounting-setting.service.js";
import journalEntryService from "../../accounting/journal-entry/journal-entry.service.js";

// Draft -> Posted is the real posting event (GL + register/bank balance decrement, mirroring every
// other "approving IS posting" transactional document in this platform — WasteRecord,
// ManualConsumption, GoodsReceiptNote). Cancelled is only reachable from Draft — a Posted expense
// has already moved real cash and posted a GL entry; reversing it is a future capability (a
// reversing entry, matching JournalEntry's own reversal convention), not a status flip.
//
// Recurring Expenses (additive): Draft -> PendingApproval -> Approved -> Posted is a second,
// optional path a recurring-generated occurrence can take when its template requires review before
// posting — every original transition above is untouched, so every existing (non-recurring) caller
// keeps working exactly as before.
const transitionGuard = createTransitionGuard({
  Draft: ["Posted", "Cancelled", "PendingApproval"],
  PendingApproval: ["Approved", "Rejected"],
  Approved: ["Posted"],
  Posted: [],
  Rejected: [],
  Cancelled: [],
});

function journalLine(account, description, debit, credit, currency) {
  return { account, description, debit, credit, currency };
}

class DailyExpenseService extends AdvancedService {
  constructor() {
    super(DailyExpenseModel, {
      brandScoped: true,
      // A real money-out event with its own Draft/Posted/Cancelled lifecycle — not master data.
      // No `isDeleted` field on this model either way (see the prior fix this replaces).
      enableSoftDelete: false,
      defaultPopulate: [
        "brand", "branch", "expense", "costCenter", "paid.paymentMethod", "paid.cashRegister",
        "paid.bankAccount", "paid.paidBy", "journalEntry", "recurringExpenseTemplate",
        "createdBy", "updatedBy",
      ],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
      // `status`/`journalEntry`/`number` may only change through beforeCreate (number) and
      // postExpense() (status/journalEntry) — the same "generic PUT bypasses business rules"
      // defect class already fixed on Order/Invoice/CashierShift. The approval-audit fields and
      // `recurringExpenseTemplate` (an immutable origin tag, set once at creation) are locked for
      // the same reason.
      lockedUpdateFields: [
        "status", "journalEntry", "number", "recurringExpenseTemplate",
        "submittedBy", "submittedAt", "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "rejectionReason",
      ],
    });
  }

  /**
   * Generates the sequential `number` and validates every payment line resolves to exactly one
   * settlement account (cashRegister XOR bankAccount) — the model itself allows either being unset
   * or both being set (Mongoose has no clean schema-level XOR across two optional refs), so this is
   * the one place that constraint is actually enforced, before a single record can be created with
   * an ambiguous or unresolvable payment line.
   */
  async beforeCreate(data) {
    const number = await expenseSettingsService.getNextExpenseNumber(data.brand, data.branch);

    for (const line of data.paid || []) {
      const hasCashRegister = Boolean(line.cashRegister);
      const hasBankAccount = Boolean(line.bankAccount);
      if (hasCashRegister === hasBankAccount) {
        throwError(
          "Each expense payment line must specify exactly one of cashRegister or bankAccount, not both or neither.",
          400,
        );
      }
    }

    return { ...data, number };
  }

  async afterCreate(document) {
    if (document.status === "Posted") {
      await this._postExpenseAccounting(document, document.createdBy);
    }
    return document;
  }

  /**
   * Draft -> Posted: the real posting event. Reuses the exact `afterCreate`-time logic via
   * `_postExpenseAccounting`, matching `purchase-invoice.service.js#transition`'s own "immediate
   * post on create OR explicit transition later" duality.
   */
  async postExpense({ id, brand, branch, actorId }) {
    const expense = await this.model.findOne({ _id: id, brand, branch });
    if (!expense) throwError("Daily expense not found.", 404);
    transitionGuard.assertValid(expense.status, "Posted");

    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: expense.status },
      { $set: { status: "Posted" } },
      { new: true },
    );
    if (!claimed) throwError("This expense was already transitioned by a concurrent request.", 409);

    await this._postExpenseAccounting(claimed, actorId);
    return claimed;
  }

  /** Recurring Expenses: Draft -> PendingApproval. Opts a Draft occurrence into the review path instead of direct posting. */
  async submitForApproval({ id, brand, branch, actorId }) {
    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: "Draft" },
      { $set: { status: "PendingApproval", submittedBy: actorId, submittedAt: new Date() } },
      { new: true },
    );
    if (!claimed) throwError("Daily expense not found, or is not Draft.", 409);
    return claimed;
  }

  /** Recurring Expenses: PendingApproval -> Approved. Does not post — see postExpense() for that. */
  async approveExpense({ id, brand, branch, actorId }) {
    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: "PendingApproval" },
      { $set: { status: "Approved", approvedBy: actorId, approvedAt: new Date() } },
      { new: true },
    );
    if (!claimed) throwError("Daily expense not found, or is not PendingApproval.", 409);
    return claimed;
  }

  /** Recurring Expenses: PendingApproval -> Rejected. Terminal — a rejected occurrence is never posted. */
  async rejectExpense({ id, brand, branch, actorId, reason }) {
    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: "PendingApproval" },
      { $set: { status: "Rejected", rejectedBy: actorId, rejectedAt: new Date(), rejectionReason: reason ?? null } },
      { new: true },
    );
    if (!claimed) throwError("Daily expense not found, or is not PendingApproval.", 409);
    return claimed;
  }

  /**
   * Debit the expense's own GL account (+ tax, if any and configured) / credit each distinct
   * cash-register or bank account a payment line actually settled through — a multi-line expense
   * split across two registers posts one balanced entry with one credit line per distinct account,
   * not one entry per payment line. Decrements each settlement account's own cached `balance`
   * (locked against the generic PUT — this engine is the one legitimate writer, exactly like
   * CashierShift's variance posting is the legitimate writer of its own shift's fields).
   */
  async _postExpenseAccounting(dailyExpense, actorId) {
    // Register/bank balance decrements happen UNCONDITIONALLY, before the GL-posting attempt below
    // — a `CashRegister.balance`/`BankAccount.balance` represents physical cash/funds that actually
    // left the account the moment this expense was paid, a real-world fact independent of whether
    // the accounting GL happens to be configured. An earlier version of this method gated the
    // decrement on the GL posting succeeding, reasoning "don't drain a balance with nothing to show
    // for it in the GL" — backwards: the cash is gone either way, and gating a real operational
    // fact on optional accounting configuration left the register's own cached balance silently
    // stale (the same bug class, and the same fix, as `asset-depreciation.service.js#postDepreciation`).
    const balanceDecrements = [];
    for (const line of dailyExpense.paid || []) {
      if (line.cashRegister) balanceDecrements.push({ Model: CashRegisterModel, id: line.cashRegister, amount: line.amount });
      else if (line.bankAccount) balanceDecrements.push({ Model: BankAccountModel, id: line.bankAccount, amount: line.amount });
    }
    await Promise.all(
      balanceDecrements.map(({ Model, id, amount }) => Model.updateOne({ _id: id }, { $inc: { balance: -amount } })),
    );

    try {
      const [expenseType, settings] = await Promise.all([
        ExpenseModel.findOne({ _id: dailyExpense.expense, brand: dailyExpense.brand }).select("accountId").lean(),
        accountingSettingService.resolveForPosting(dailyExpense.brand, dailyExpense.branch),
      ]);

      const currency = settings.currencySettings?.baseCurrency || "EGP";
      const expenseAccount = expenseType?.accountId || settings.activities?.expense?.defaultExpense;
      if (!expenseAccount) return;

      const description = `Daily Expense #${dailyExpense.number} - ${dailyExpense.expenseDescription}`;
      const lines = [];

      const taxAmount = dailyExpense.taxAmount || 0;
      const taxAccount = settings.activities?.expense?.tax;
      let expenseDebit = (dailyExpense.paid || []).reduce((sum, line) => sum + line.amount, 0);

      if (taxAmount > 0) {
        if (taxAccount) {
          lines.push(journalLine(taxAccount, description, taxAmount, 0, currency));
        } else {
          expenseDebit += taxAmount;
        }
      }
      if (expenseDebit > 0) {
        lines.unshift(journalLine(expenseAccount, description, expenseDebit, 0, currency));
      }

      // Group payment lines by their resolved settlement account — one credit line per distinct
      // account, correctly balanced regardless of how many payment lines reference the same one.
      const creditByAccount = new Map();
      for (const line of dailyExpense.paid || []) {
        if (line.cashRegister) {
          const register = await CashRegisterModel.findById(line.cashRegister).select("accountId").lean();
          if (register?.accountId) {
            const key = String(register.accountId);
            creditByAccount.set(key, (creditByAccount.get(key) || 0) + line.amount);
          }
        } else if (line.bankAccount) {
          const bank = await BankAccountModel.findById(line.bankAccount).select("accountId").lean();
          if (bank?.accountId) {
            const key = String(bank.accountId);
            creditByAccount.set(key, (creditByAccount.get(key) || 0) + line.amount);
          }
        }
      }
      for (const [account, amount] of creditByAccount) {
        lines.push(journalLine(account, description, 0, amount, currency));
      }

      if (lines.length === 0) return;

      const { entry } = await journalEntryService.postFromSource({
        sourceType: "EXPENSE_VOUCHER",
        brand: dailyExpense.brand,
        branch: dailyExpense.branch,
        date: dailyExpense.date || new Date(),
        description,
        lines,
        createdBy: actorId,
        sourceRef: dailyExpense._id,
      });

      await this.model.updateOne({ _id: dailyExpense._id }, { $set: { journalEntry: entry._id } });
      dailyExpense.journalEntry = entry._id;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[daily-expense.service] Journal entry not posted for expense ${dailyExpense.number}: ${err.message}`);
    }
  }
}

export default new DailyExpenseService();
export { transitionGuard as dailyExpenseTransitionGuard };
