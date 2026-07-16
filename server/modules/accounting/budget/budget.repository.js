// Repository layer (BACKEND_FOUNDATION.md §4.3): owns all direct database access for Budget.
// Generic CRUD (inherited) plus the extra primitives the approval/versioning workflow in
// budget.service.js needs — mirrors journal-entry.repository.js's shape exactly.
import BaseRepository from "../../../utils/BaseRepository.js";
import BudgetModel from "./budget.model.js";

class BudgetRepository extends BaseRepository {
  constructor() {
    super(BudgetModel, {
      brandScoped: true,
      branchScoped: false,
      // A budget is a transactional financial-planning document with its own explicit
      // Draft/PendingApproval/Approved/Rejected/Closed lifecycle — soft-delete does not apply,
      // matching JournalEntry/AssetDisposal's identical reasoning elsewhere in this domain.
      enableSoftDelete: false,
      defaultPopulate: ["brand", "branch", "costCenter", "previousVersion", "createdBy", "submittedBy", "approvedBy", "rejectedBy"],
      searchableFields: [],
      defaultSort: { fiscalYear: -1, version: -1 },
      // Every workflow/derived field is written exclusively by budget.service.js's business-verb
      // methods (submitForApproval/approveBudget/rejectBudget/createNewVersion), never by a generic
      // PUT — the exact "generic PUT bypasses business rules" defect class fixed repeatedly
      // elsewhere in this domain (Order, Invoice, CashierShift, DailyExpense, Asset).
      lockedUpdateFields: [
        "brand", "branch", "costCenter", "fiscalYear", "status", "version", "previousVersion",
        "isCurrentVersion", "totalAnnualAmount", "submittedBy", "submittedAt", "approvedBy",
        "approvedAt", "rejectedBy", "rejectedAt", "rejectionReason",
      ],
    });
  }

  /** Insert one Budget header document within an existing transaction session. */
  async insertBudget(data, session) {
    const [budget] = await BudgetModel.create([data], { session });
    return budget;
  }

  /** Brand-scoped lookup, session-aware — the read every transition method below needs before deciding legality. */
  async findByIdScoped(id, brandId, session) {
    return this.model.findOne({ _id: id, brand: brandId }).session(session ?? null);
  }

  /**
   * Optimistic-precondition status transition — only succeeds if the document still matches
   * `fromStatus` at write time, so two concurrent submit/approve/reject calls on the same budget
   * can't both succeed. Returns null (not an error) if the precondition didn't hold.
   */
  async transitionStatus(id, brandId, fromStatus, updateFields, session) {
    return this.model.findOneAndUpdate(
      { _id: id, brand: brandId, status: fromStatus },
      { $set: updateFields },
      { new: true, session: session ?? undefined },
    );
  }

  /** The budget currently treated as authoritative for a given scope+year (see model header comment). */
  async findCurrentVersion({ brand, branch, costCenter, fiscalYear }, session) {
    return this.model
      .findOne({ brand, branch: branch ?? null, costCenter: costCenter ?? null, fiscalYear, isCurrentVersion: true })
      .session(session ?? null);
  }

  /** Unsets isCurrentVersion on whatever budget currently holds it for this scope+year, within a transaction. */
  async clearCurrentVersion({ brand, branch, costCenter, fiscalYear }, session) {
    return this.model.updateMany(
      { brand, branch: branch ?? null, costCenter: costCenter ?? null, fiscalYear, isCurrentVersion: true },
      { $set: { isCurrentVersion: false } },
      { session: session ?? undefined },
    );
  }
}

export default BudgetRepository;
