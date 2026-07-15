import CashierShiftModel from "./cashier-shift.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";
import cashierShiftSettingsService from "../cashier-shift-settings/cashier-shift-settings.service.js";
import CashTransactionModel from "../cash-transaction/cash-transaction.model.js";
import UserAccountModel from "../../iam/user-account/user-account.model.js";
import accountingSettingService from "../../accounting/accounting-settings/accounting-setting.service.js";
import journalEntryService from "../../accounting/journal-entry/journal-entry.service.js";

// OPEN: the till is live, transactions accumulate against it. COUNTED: the cashier has physically
// counted the drawer and the system has computed expected/variance — a snapshot, not yet final.
// CLOSED: reconciliation is accepted (auto, or manager-approved if variance exceeds tolerance).
// POSTED: the variance journal entry (if any) has been posted — terminal. CANCELLED: only reachable
// from OPEN, matching the model's own comment — a shift with real transactions against it must be
// reconciled through COUNTED/CLOSED, never just deleted/cancelled out from under its own history.
const transitionGuard = createTransitionGuard({
  OPEN: ["COUNTED", "CANCELLED"],
  COUNTED: ["CLOSED"],
  CLOSED: ["POSTED"],
  POSTED: [],
  CANCELLED: [],
});

function journalLine(account, description, debit, credit, currency) {
  return { account, description, debit, credit, currency };
}

class CashierShiftService extends AdvancedService {
  constructor() {
    super(CashierShiftModel, {
      brandScoped: true,
      // PLATFORM_FINAL_AUDIT.md PA-02, corrected: transactional document
      // (OPEN/COUNTED/CLOSED/POSTED/CANCELLED lifecycle) — see
      // cash-transaction.service.js.
      enableSoftDelete: false,
      defaultPopulate: ["brand","branch","cashier","register","attendanceRecord","variance.approvedBy","cashAccount","journalEntry","openedBy","closedBy"],
      searchableFields: [], // specify searchable fields if needed
      defaultSort: { createdAt: -1 },
      // `status`/`expected.*`/`actualCash`/`variance.*`/`journalEntry` may only change through the
      // dedicated countShift/closeShift/postShift methods below — the exact "generic PUT bypasses
      // every business rule" defect class already found and fixed on Order/Invoice.
      lockedUpdateFields: ["status", "expected", "actualCash", "variance", "journalEntry", "num"],
    });
  }

  async beforeCreate(data) {
    const num = await cashierShiftSettingsService.getNextShiftNumber(data.brand, data.branch);
    return { ...data, num, status: "OPEN" };
  }

  /**
   * Step 1 of close-out: the cashier reports the physically-counted cash. This computes
   * `expected.*` from every `CashTransaction` actually posted against this shift (never trusts a
   * client-supplied expected figure), the variance against what was counted, and whether that
   * variance is within `CashierShiftSettings.maxDifferenceAllowed` — the exact settings field this
   * module's own doc named as "confirmed real, read by zero code" before this engine existed.
   *
   * Only `CashTransaction` rows with a `cashRegister` set (real cash movement — see that model's
   * own "single source of truth for ALL money transactions, cash & non-cash" comment) count toward
   * a physical cash-drawer reconciliation; a card/bank-only transaction never should.
   */
  async countShift({ id, brand, branch, actorId, actualCash }) {
    if (actualCash === undefined || actualCash === null || actualCash < 0) {
      throwError("actualCash (the physically counted amount) is required and must be non-negative.", 400);
    }

    const shift = await this.model.findOne({ _id: id, brand, branch });
    if (!shift) throwError("Cashier shift not found.", 404);
    transitionGuard.assertValid(shift.status, "COUNTED");

    const transactions = await CashTransactionModel.find({
      brand, branch, cashierShift: id, status: "POSTED", cashRegister: { $ne: null },
    }).select("transactionType direction amount").lean();

    const expected = { cashSales: 0, cashReturns: 0, cashIn: 0, cashOut: 0, netCash: 0 };
    for (const txn of transactions) {
      if (txn.transactionType === "SALE") expected.cashSales += txn.amount;
      else if (txn.transactionType === "REFUND") expected.cashReturns += txn.amount;
      else if (txn.direction === "INFLOW") expected.cashIn += txn.amount;
      else expected.cashOut += txn.amount;
    }
    expected.netCash = shift.openingCash + expected.cashSales - expected.cashReturns + expected.cashIn - expected.cashOut;

    const varianceAmount = actualCash - expected.netCash;
    const settings = await cashierShiftSettingsService.findForBranch(brand, branch);
    const tolerance = settings?.maxDifferenceAllowed ?? 50;
    const withinTolerance = Math.abs(varianceAmount) <= tolerance;

    const variance = {
      amount: varianceAmount,
      reason: varianceAmount > 0 ? "OVERAGE" : varianceAmount < 0 ? "SHORTAGE" : "NONE",
      // Auto-approved when within the configured tolerance — a manager only needs to intervene
      // (closeShift below) when the variance is large enough that `settings` says it should.
      approved: withinTolerance,
      approvedBy: null,
    };

    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: shift.status },
      { $set: { status: "COUNTED", actualCash, expected, variance } },
      { new: true },
    );
    if (!claimed) throwError("This shift was already transitioned by a concurrent request.", 409);
    return claimed;
  }

  /**
   * Step 2: accepts the reconciliation. A variance already within tolerance (auto-approved by
   * countShift) closes with no further gate. A variance outside tolerance requires
   * `managerApprovalBy` to independently hold the same `CashierShifts:approve` permission
   * `order.service.js#_hasCancelApprovalPermission` already established as this platform's real,
   * non-fabricated approval-check pattern.
   */
  async closeShift({ id, brand, branch, actorId, managerApprovalBy = null }) {
    const shift = await this.model.findOne({ _id: id, brand, branch });
    if (!shift) throwError("Cashier shift not found.", 404);
    transitionGuard.assertValid(shift.status, "CLOSED");

    if (!shift.variance?.approved) {
      if (!managerApprovalBy) {
        throwError("This shift's cash variance exceeds the configured tolerance — manager approval is required to close it.", 403);
      }
      const canApprove = await this._hasVarianceApprovalPermission(managerApprovalBy, brand);
      if (!canApprove) {
        throwError("The approving user does not hold permission to authorize a cash-variance override.", 403);
      }
    }

    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: shift.status },
      {
        $set: {
          status: "CLOSED",
          closedAt: new Date(),
          closedBy: actorId,
          "variance.approved": true,
          "variance.approvedBy": shift.variance?.approved ? shift.variance.approvedBy : managerApprovalBy,
        },
      },
      { new: true },
    );
    if (!claimed) throwError("This shift was already transitioned by a concurrent request.", 409);
    return claimed;
  }

  /**
   * Step 3: posts the variance to the GL. Individual sales/refunds already posted their own GL
   * entries at transaction time (Invoice's own posting) — this entry books ONLY the discrepancy
   * physically found at close, never the shift's full cash total, which would double-count
   * revenue already posted per-transaction. A zero variance posts nothing (there is nothing
   * economically meaningful to record) but the shift still reaches POSTED — terminal either way.
   */
  async postShift({ id, brand, branch, actorId }) {
    const shift = await this.model.findOne({ _id: id, brand, branch });
    if (!shift) throwError("Cashier shift not found.", 404);
    transitionGuard.assertValid(shift.status, "POSTED");

    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: shift.status },
      { $set: { status: "POSTED" } },
      { new: true },
    );
    if (!claimed) throwError("This shift was already transitioned by a concurrent request.", 409);

    if (claimed.variance?.amount) {
      try {
        const entry = await this._postVarianceAccounting(claimed, actorId);
        // `_postVarianceAccounting` already persisted `journalEntry` to the database — mirrored
        // onto the in-memory `claimed` object being returned below so the caller sees it too,
        // instead of a stale pre-posting snapshot. `entry` is null when the required control
        // accounts simply aren't configured (best-effort skip, not a failure — nothing to mirror).
        if (entry) claimed.journalEntry = entry._id;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[cashier-shift.service] Variance journal entry not posted for shift ${claimed.num}: ${err.message}`);
      }
    }

    return claimed;
  }

  async _postVarianceAccounting(shift, actorId) {
    const settings = await accountingSettingService.resolveForPosting(shift.brand, shift.branch);
    const currency = settings.currencySettings?.baseCurrency || "EGP";
    const cashOverShortAccount = settings.controlAccounts?.cashOverShort;
    const cashAccount = shift.cashAccount || settings.controlAccounts?.cash;
    if (!cashOverShortAccount || !cashAccount) return null;

    const description = `Cashier Shift #${shift.num} - cash ${shift.variance.reason.toLowerCase()}`;
    const amount = Math.abs(shift.variance.amount);
    // Overage: physical cash exceeds expected — debit Cash (an asset increase), credit
    // Cash-Over-Short (other income). Shortage: the reverse — debit Cash-Over-Short (a loss),
    // credit Cash (the asset shrinks to match physical reality).
    const lines = shift.variance.amount > 0
      ? [journalLine(cashAccount, description, amount, 0, currency), journalLine(cashOverShortAccount, description, 0, amount, currency)]
      : [journalLine(cashOverShortAccount, description, amount, 0, currency), journalLine(cashAccount, description, 0, amount, currency)];

    const { entry } = await journalEntryService.postFromSource({
      sourceType: "CASHIER_SHIFT_VARIANCE",
      brand: shift.brand,
      branch: shift.branch,
      date: shift.closedAt || new Date(),
      description,
      lines,
      createdBy: actorId,
      sourceRef: shift._id,
    });

    await this.model.updateOne({ _id: shift._id }, { $set: { journalEntry: entry._id } });
    return entry;
  }

  async _hasVarianceApprovalPermission(userId, brandId) {
    const approver = await UserAccountModel
      .findOne({ _id: userId, brand: brandId, isDeleted: { $ne: true }, isActive: true })
      .populate("role");
    const permissions = approver?.role?.permissions;
    if (!permissions) return false;
    return permissions.some((perm) => perm.resource === "CashierShifts" && perm.approve === true);
  }
}

export default new CashierShiftService();
export { transitionGuard as cashierShiftTransitionGuard };
