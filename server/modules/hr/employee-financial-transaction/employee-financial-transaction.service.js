// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only.
// This module previously had ZERO business logic — a raw CRUD wrapper
// around a ledger of financial transactions, with `isApproved`/`isCancelled`
// as plain fields any generic PUT could flip with no workflow gate at all.
import throwError from "../../../utils/throwError.js";
import EmployeeFinancialTransactionRepository from "./employee-financial-transaction.repository.js";
import { TYPE_CATEGORY_MAP } from "./employee-financial-transaction.model.js";

class EmployeeFinancialTransactionService extends EmployeeFinancialTransactionRepository {
  /**
   * Single source of truth for type->category consistency (HD-011's
   * cross-module review): every type except "salary_adjustment" has
   * exactly one valid category — a client must not be able to record
   * `type:"tip"` with `category:"deduction"`.
   */
  assertTypeCategoryConsistency(type, category) {
    const expectedCategory = TYPE_CATEGORY_MAP[type];

    if (expectedCategory && expectedCategory !== category) {
      throwError(`Transaction type "${type}" must have category "${expectedCategory}", not "${category}"`, 400);
    }
  }

  /** `payrollEffect` is never trusted from client input — always derived from the validated category. */
  derivePayrollEffect(category) {
    return category === "earning" ? "credit" : "debit";
  }

  assertMutable(existing) {
    if (existing.isPayrollProcessed) {
      throwError("This transaction has already been processed by payroll and can no longer be modified", 400);
    }
    if (existing.isCancelled) {
      throwError("This transaction has been cancelled and can no longer be modified", 400);
    }
  }

  async beforeCreate(data) {
    this.assertTypeCategoryConsistency(data.type, data.category);
    data.payrollEffect = this.derivePayrollEffect(data.category);

    return data;
  }

  /**
   * Overridden (not just beforeUpdate) because a financial transaction's
   * mutability depends on its CURRENT stored state (approved/cancelled/
   * processed), which beforeUpdate cannot see — same pattern already used
   * by AttendanceRecord and EmployeeFinancialProfile in this rollout.
   */
  async update(opts) {
    this.validateObjectId(opts.id);

    const existing = await this.model.findOne({ _id: opts.id, brand: opts.brandId, isDeleted: false }).lean();
    if (!existing) {
      throwError("Resource not found", 404);
    }

    this.assertMutable(existing);

    if (existing.isApproved) {
      throwError(
        "This transaction has already been approved — cancel it and record a new transaction instead of editing an approved one",
        400,
      );
    }

    const type = opts.data.type ?? existing.type;
    const category = opts.data.category ?? existing.category;

    if (opts.data.type || opts.data.category) {
      this.assertTypeCategoryConsistency(type, category);
      opts.data.payrollEffect = this.derivePayrollEffect(category);
    }

    return super.update(opts);
  }

  /**
   * Approval workflow — the only way `isApproved` may become `true`.
   * Previously a raw field any generic PUT could set directly, with no
   * actor recorded reliably and no guard against double-approval.
   */
  async approve({ id, brandId, approvedBy }) {
    this.validateObjectId(id);

    const existing = await this.model.findOne({ _id: id, brand: brandId, isDeleted: false }).lean();
    if (!existing) throwError("Resource not found", 404);

    if (existing.isApproved) throwError("This transaction is already approved", 400);
    if (existing.isCancelled) throwError("A cancelled transaction cannot be approved", 400);

    return this.model
      .findOneAndUpdate(
        { _id: id, brand: brandId },
        { isApproved: true, approvedBy, approvedAt: new Date() },
        { new: true },
      )
      .lean();
  }

  /**
   * Cancellation workflow — the only way `isCancelled` may become `true`.
   * A payroll-processed transaction cannot be cancelled retroactively
   * (that would silently invalidate a payroll run that already used it) —
   * reversing a processed transaction requires a new offsetting
   * transaction, not a cancellation, mirroring standard accounting
   * practice (never edit a posted entry, reverse it).
   */
  async cancel({ id, brandId, cancelledBy, cancellationReason }) {
    this.validateObjectId(id);

    const existing = await this.model.findOne({ _id: id, brand: brandId, isDeleted: false }).lean();
    if (!existing) throwError("Resource not found", 404);

    if (existing.isCancelled) throwError("This transaction is already cancelled", 400);
    if (existing.isPayrollProcessed) {
      throwError(
        "This transaction has already been processed by payroll — record an offsetting transaction instead of cancelling it",
        400,
      );
    }

    return this.model
      .findOneAndUpdate(
        { _id: id, brand: brandId },
        { isCancelled: true, cancelledBy, cancelledAt: new Date(), cancellationReason: cancellationReason || null },
        { new: true },
      )
      .lean();
  }
}

export default new EmployeeFinancialTransactionService();
