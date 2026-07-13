// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access for
// EmployeeFinancialTransaction. Previously this module had no repository
// file at all — the service instantiated BaseRepository directly under the
// stale name "AdvancedService", with a `softDelete: true` option key that
// doesn't exist on BaseRepository's constructor (the real option is
// `enableSoftDelete`) — harmless only because `enableSoftDelete` already
// defaults to `true`, but corrected here for clarity.
import mongoose from "mongoose";
import BaseRepository from "../../../utils/BaseRepository.js";
import EmployeeFinancialTransactionModel from "./employee-financial-transaction.model.js";

class EmployeeFinancialTransactionRepository extends BaseRepository {
  constructor() {
    super(EmployeeFinancialTransactionModel, {
      brandScoped: true,
      branchScoped: false,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "employee", "approvedBy", "createdBy", "updatedBy", "cancelledBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * Payroll-first: every approved, non-cancelled, unprocessed transaction
   * for one employee's payroll month — the exact set a future Payroll
   * calculation run (module 15) would sweep up and mark
   * `isPayrollProcessed`. Not consumed by Payroll yet, built so that
   * module's own turn doesn't need a new repository method.
   */
  async findUnprocessedApprovedForPeriod(brandId, employeeId, payrollMonth) {
    return this.model
      .find({
        brand: brandId,
        employee: employeeId,
        payrollMonth,
        isApproved: true,
        isCancelled: false,
        isPayrollProcessed: false,
        isDeleted: false,
      })
      .lean();
  }

  /** Aggregated totals by category for one employee's payroll month — the Financial Summary primitive. */
  async monthlySummary({ brandId, employeeId, payrollMonth }) {
    const [totals] = await this.model.aggregate([
      {
        $match: {
          brand: new mongoose.Types.ObjectId(brandId),
          employee: new mongoose.Types.ObjectId(employeeId),
          payrollMonth,
          isCancelled: false,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: { $cond: [{ $eq: ["$category", "earning"] }, "$amount", 0] } },
          totalDeductions: { $sum: { $cond: [{ $eq: ["$category", "deduction"] }, "$amount", 0] } },
          approvedCount: { $sum: { $cond: ["$isApproved", 1, 0] } },
          pendingApprovalCount: { $sum: { $cond: ["$isApproved", 0, 1] } },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const result = totals || {
      totalEarnings: 0,
      totalDeductions: 0,
      approvedCount: 0,
      pendingApprovalCount: 0,
      transactionCount: 0,
    };

    return { ...result, netAmount: result.totalEarnings - result.totalDeductions };
  }
}

export default EmployeeFinancialTransactionRepository;
