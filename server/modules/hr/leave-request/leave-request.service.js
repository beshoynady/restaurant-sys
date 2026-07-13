// Service layer (BACKEND_FOUNDATION.md §4.3): the Leave Management Engine —
// policy resolution, balance computation, a guarded multi-step approval
// workflow, and the AttendanceRecord/EmployeeFinancialTransaction side
// effects a real ERP's leave module must produce. Previously this module
// had a hand-written service with zero business logic (same defect class
// as HD-012, fixed here at this module's own turn).
import throwError from "../../../utils/throwError.js";
import LeaveRequestRepository from "./leave-request.repository.js";
import employeeSettingsService from "../employee-settings/employee-settings.service.js";
import attendanceSettingsService from "../attendance-settings/attendance-settings.service.js";
import attendanceRecordService from "../attendance-record/attendance-record.service.js";
import employeeFinancialTransactionService from "../employee-financial-transaction/employee-financial-transaction.service.js";
import {
  getPolicyYearRange,
  enumerateDates,
  isWorkingDay,
  computeAccruedEntitlement,
  computeUnpaidDeductionAmount,
  mapLeaveTypeToAttendanceType,
} from "./leave-request.domain.js";

// Statuses a "pending my action" queue should surface — exported for the
// controller's pendingRequests() query rather than re-declaring the list.
export const PENDING_REVIEW_STATUSES = ["submitted", "manager_review", "hr_review"];

const TRANSITIONS = {
  submit: { from: ["draft"], to: "submitted" },
  // On manager approval, status moves straight to "hr_review" (that status
  // value represents "awaiting HR's decision", not an intermediate resting
  // state distinct from the action that resolves it) — see managerReview().
  managerReview: { from: ["submitted"], to: null }, // branches to hr_review or rejected
  hrReview: { from: ["hr_review"], to: null }, // branches to approved or rejected
  cancel: { from: ["draft", "submitted", "manager_review", "hr_review", "approved"], to: "cancelled" },
  complete: { from: ["approved"], to: "completed" },
  close: { from: ["completed"], to: "closed" },
};

class LeaveRequestService extends LeaveRequestRepository {
  assertTransition(action, currentStatus) {
    const rule = TRANSITIONS[action];
    if (!rule.from.includes(currentStatus)) {
      throwError(`Cannot ${action} a leave request in "${currentStatus}" status (must be one of: ${rule.from.join(", ")})`, 400);
    }
  }

  async loadOr404(id, brandId) {
    this.validateObjectId(id);
    const request = await this.model.findOne({ _id: id, brand: brandId, isDeleted: false }).lean();
    if (!request) throwError("Leave request not found", 404);
    return request;
  }

  // ===================== Policy resolution (HD-003 consumer) =====================

  resolvePayrollTreatment(policy) {
    if (!policy.isPaidByDefault) {
      return { payRatio: "none", fundedBy: "employee", deductionSource: "salary" };
    }
    return { payRatio: "full", fundedBy: "company", deductionSource: "leaveBalance" };
  }

  // ===================== Leave Balance Engine =====================

  /**
   * Live-computed balance for one employee/leaveType — never a separately
   * stored, mutable number (see module doc §5 for why: a stored balance can
   * drift from the requests that justify it; this recomputes from the
   * resolved policy + actual approved-request history every time).
   */
  async getLeaveBalance(employeeId, brandId, leaveType, asOf = new Date()) {
    const employee = await this.findEmployeeForScope(employeeId, brandId);
    if (!employee) throwError("Employee not found", 404);

    const settings = await this.findEmployeeSettingsForBrand(brandId);
    const policy = employeeSettingsService.resolveLeaveTypePolicy(settings, leaveType);

    const { start: yearStart, end: yearEnd } = getPolicyYearRange(asOf);
    const entitlement = computeAccruedEntitlement({ policy, hireDate: employee.hireDate || yearStart, asOf });

    const [usedDays, encashedDays] = await Promise.all([
      this.sumApprovedDays({ brandId, employeeId, leaveType, rangeStart: yearStart, rangeEnd: yearEnd }),
      this.sumEncashedDays({ brandId, employeeId, leaveType, rangeStart: yearStart, rangeEnd: yearEnd }),
    ]);

    // Carry-forward from the prior year is intentionally NOT computed here —
    // see module doc §5's documented limitation (would require a persisted
    // year-end snapshot to avoid recursing indefinitely back through every
    // prior year on every balance read). Reserved for a future extension.
    const remaining = entitlement - usedDays - encashedDays;

    return {
      leaveType,
      policyYear: yearStart.getUTCFullYear(),
      entitlement,
      used: usedDays,
      encashed: encashedDays,
      remaining,
      allowNegativeBalance: policy.allowNegativeBalance,
    };
  }

  /** Balance for every leave type this brand has configured (or defaulted) a nonzero entitlement/policy for. */
  async getAllLeaveBalances(employeeId, brandId, asOf = new Date()) {
    const settings = await this.findEmployeeSettingsForBrand(brandId);
    const policies = settings?.leavePolicy?.policies;
    const configuredTypes = policies instanceof Map ? [...policies.keys()] : Object.keys(policies || {});

    // Always include the legacy three even if the brand hasn't explicitly
    // configured them (they still resolve via defaultPolicy/hard defaults).
    const types = [...new Set(["annual", "sick", "emergency", ...configuredTypes])];

    return Promise.all(types.map((type) => this.getLeaveBalance(employeeId, brandId, type, asOf)));
  }

  // ===================== Restaurant Operations rules =====================

  assertNoBlackoutConflict(settings, startDate, endDate) {
    const blackouts = settings?.leavePolicy?.blackoutPeriods || [];
    const conflict = blackouts.find((b) => b.startDate <= endDate && b.endDate >= startDate);
    if (conflict) {
      throwError(`Requested dates fall within a blackout period${conflict.reason ? `: ${conflict.reason}` : ""}`, 400);
    }
  }

  async assertMinimumCoverage({ brandId, departmentId, startDate, endDate, employeeId, settings, excludeId }) {
    const ratio = settings?.leavePolicy?.minimumDepartmentCoverageRatio || 0;
    if (ratio <= 0) return;

    const [headcount, overlapping] = await Promise.all([
      this.countActiveDepartmentHeadcount(departmentId, brandId),
      this.countOverlappingApprovedLeaves({ departmentId, brandId, startDate, endDate, excludeEmployeeId: employeeId, excludeId }),
    ]);

    if (headcount === 0) return;

    const remainingRatio = (headcount - overlapping - 1) / headcount;
    if (remainingRatio < ratio) {
      throwError(
        `Approving this leave would drop department coverage below the required minimum (${Math.round(ratio * 100)}%)`,
        400,
      );
    }
  }

  // ===================== Create =====================

  async beforeCreate(data) {
    const employee = await this.findEmployeeForScope(data.employee, data.brand);
    if (!employee) throwError("Employee not found", 404);

    if (data.branch && !employee.branches.some((b) => String(b) === String(data.branch))) {
      throwError("This employee is not assigned to the selected branch", 400);
    }
    if (data.department === undefined) data.department = employee.department;

    if (data.requestKind === "encashment") {
      data.startDate = data.startDate || data.endDate;
      data.endDate = data.startDate;
    }

    if (data.totalDays === undefined) {
      const attendanceSettings = await attendanceSettingsService.resolveForBranch(data.brand, data.branch);
      const weeklyOffDays = attendanceSettings.settings.workCalendar.weeklyOffDays;
      const workingDates = enumerateDates(new Date(data.startDate), new Date(data.endDate)).filter((d) =>
        isWorkingDay(d, weeklyOffDays),
      );
      data.totalDays = Math.max(workingDates.length, 0.5);
    }

    const settings = await this.findEmployeeSettingsForBrand(data.brand);
    const policy = employeeSettingsService.resolveLeaveTypePolicy(settings, data.leaveType);

    const treatment = this.resolvePayrollTreatment(policy);
    data.payrollTreatment = treatment;
    data.isPaid = treatment.payRatio !== "none";

    this.assertNoBlackoutConflict(settings, new Date(data.startDate), new Date(data.endDate));

    if (!policy.allowNegativeBalance) {
      const balance = await this.getLeaveBalance(data.employee, data.brand, data.leaveType, new Date(data.startDate));
      if (data.totalDays > balance.remaining) {
        throwError(
          `Requested ${data.totalDays} day(s) exceed the remaining "${data.leaveType}" balance (${balance.remaining})`,
          400,
        );
      }
    }

    return data;
  }

  // ===================== Workflow =====================

  async submit({ id, brandId, submittedBy }) {
    const request = await this.loadOr404(id, brandId);
    this.assertTransition("submit", request.status);

    return this.model
      .findOneAndUpdate({ _id: id, brand: brandId }, { status: "submitted", submittedBy, submittedAt: new Date() }, { new: true })
      .lean();
  }

  async managerReview({ id, brandId, reviewedBy, decision, comment }) {
    const request = await this.loadOr404(id, brandId);
    this.assertTransition("managerReview", request.status);

    if (decision === "rejected") {
      return this.model
        .findOneAndUpdate(
          { _id: id, brand: brandId },
          {
            status: "rejected",
            managerReviewedBy: reviewedBy,
            managerReviewedAt: new Date(),
            managerDecision: "rejected",
            managerComment: comment || null,
            rejectedBy: reviewedBy,
            rejectedAt: new Date(),
            rejectionReason: comment || "Rejected at manager review",
          },
          { new: true },
        )
        .lean();
    }

    return this.model
      .findOneAndUpdate(
        { _id: id, brand: brandId },
        {
          status: "hr_review",
          managerReviewedBy: reviewedBy,
          managerReviewedAt: new Date(),
          managerDecision: "approved",
          managerComment: comment || null,
        },
        { new: true },
      )
      .lean();
  }

  async hrReview({ id, brandId, branchId, reviewedBy, decision, comment, createdBy }) {
    const request = await this.loadOr404(id, brandId);
    this.assertTransition("hrReview", request.status);

    if (decision === "rejected") {
      return this.model
        .findOneAndUpdate(
          { _id: id, brand: brandId },
          {
            status: "rejected",
            hrReviewedBy: reviewedBy,
            hrReviewedAt: new Date(),
            hrDecision: "rejected",
            hrComment: comment || null,
            rejectedBy: reviewedBy,
            rejectedAt: new Date(),
            rejectionReason: comment || "Rejected at HR review",
          },
          { new: true },
        )
        .lean();
    }

    const settings = await this.findEmployeeSettingsForBrand(brandId);
    await this.assertMinimumCoverage({
      brandId,
      departmentId: request.department,
      startDate: request.startDate,
      endDate: request.endDate,
      employeeId: request.employee,
      settings,
      excludeId: request._id,
    });

    // Status is flipped to "approved" FIRST (a separate write) because
    // AttendanceRecord's own consistency check (hr/attendance-record,
    // module 7) requires a linked LeaveRequest to already be "approved" in
    // the database before it will accept the link — generating attendance
    // records against a still-"hr_review" status would be rejected.
    const approvedRequest = await this.model
      .findOneAndUpdate(
        { _id: id, brand: brandId },
        {
          status: "approved",
          hrReviewedBy: reviewedBy,
          hrReviewedAt: new Date(),
          hrDecision: "approved",
          hrComment: comment || null,
          approvedBy: reviewedBy,
          approvedAt: new Date(),
        },
        { new: true },
      )
      .lean();

    let update = {};

    if (request.requestKind === "encashment") {
      const transaction = await this.processEncashment({ request: approvedRequest, brandId, branchId, createdBy: createdBy || reviewedBy });
      update = { status: "completed", payrollProcessed: true, relatedTransaction: transaction._id };
    } else {
      await this.generateAttendanceRecords({ request: approvedRequest, brandId, createdBy: createdBy || reviewedBy });
      update.attendanceGenerated = true;

      if (request.payrollTreatment.deductionSource === "salary") {
        const transaction = await this.processUnpaidDeduction({ request: approvedRequest, brandId, branchId, createdBy: createdBy || reviewedBy });
        if (transaction) {
          update.payrollProcessed = true;
          update.relatedTransaction = transaction._id;
        }
      }
    }

    return this.model.findOneAndUpdate({ _id: id, brand: brandId }, update, { new: true }).lean();
  }

  async cancel({ id, brandId, cancelledBy, cancellationReason }) {
    const request = await this.loadOr404(id, brandId);
    this.assertTransition("cancel", request.status);

    if (request.status === "approved" && new Date(request.startDate) <= new Date()) {
      throwError("Cannot cancel a leave that has already started — use recall() instead", 400);
    }

    if (request.attendanceGenerated) {
      await this.reverseAttendanceRecords(request, brandId);
    }

    return this.model
      .findOneAndUpdate(
        { _id: id, brand: brandId },
        { status: "cancelled", cancelledBy, cancelledAt: new Date(), cancellationReason: cancellationReason || null },
        { new: true },
      )
      .lean();
  }

  async complete({ id, brandId }) {
    const request = await this.loadOr404(id, brandId);
    this.assertTransition("complete", request.status);

    if (new Date(request.endDate) > new Date()) {
      throwError("Cannot complete a leave request whose end date is still in the future", 400);
    }

    return this.model.findOneAndUpdate({ _id: id, brand: brandId }, { status: "completed" }, { new: true }).lean();
  }

  async close({ id, brandId, closedBy }) {
    const request = await this.loadOr404(id, brandId);
    this.assertTransition("close", request.status);

    return this.model
      .findOneAndUpdate({ _id: id, brand: brandId }, { status: "closed", closedBy, closedAt: new Date() }, { new: true })
      .lean();
  }

  /**
   * Restaurant Operations: bringing an employee back from an already-
   * approved, currently-in-progress leave early. Shortens `endDate`,
   * recomputes `totalDays`, and reverses any already-generated
   * AttendanceRecord entries for dates after the new end date (the
   * employee is expected back at work — their own clock-in covers those
   * days going forward, not this module).
   */
  async recall({ id, brandId, recalledBy, newEndDate, recallReason }) {
    const request = await this.loadOr404(id, brandId);

    if (request.status !== "approved") {
      throwError(`Cannot recall a leave request in "${request.status}" status`, 400);
    }
    const now = new Date();
    if (new Date(request.startDate) > now) {
      throwError("Cannot recall a leave that has not started yet — cancel it instead", 400);
    }
    if (new Date(newEndDate) >= new Date(request.endDate)) {
      throwError("Recall end date must be earlier than the original end date", 400);
    }

    await this.reverseAttendanceRecords(request, brandId, new Date(newEndDate));

    const attendanceSettings = await attendanceSettingsService.resolveForBranch(brandId, request.branch);
    const weeklyOffDays = attendanceSettings.settings.workCalendar.weeklyOffDays;
    const workingDates = enumerateDates(new Date(request.startDate), new Date(newEndDate)).filter((d) =>
      isWorkingDay(d, weeklyOffDays),
    );

    return this.model
      .findOneAndUpdate(
        { _id: id, brand: brandId },
        {
          endDate: newEndDate,
          totalDays: Math.max(workingDates.length, 0.5),
          recalledBy,
          recalledAt: new Date(),
          recallReason: recallReason || null,
          recalledOriginalEndDate: request.endDate,
        },
        { new: true },
      )
      .lean();
  }

  // ===================== Attendance Integration =====================

  async generateAttendanceRecords({ request, brandId, createdBy }) {
    const attendanceSettings = await attendanceSettingsService.resolveForBranch(brandId, request.branch);
    const weeklyOffDays = attendanceSettings.settings.workCalendar.weeklyOffDays;
    const attendanceType = mapLeaveTypeToAttendanceType(request.leaveType);

    const dates = enumerateDates(new Date(request.startDate), new Date(request.endDate)).filter((d) =>
      isWorkingDay(d, weeklyOffDays),
    );

    for (const date of dates) {
      try {
        await attendanceRecordService.create({
          brandId,
          data: {
            branch: request.branch,
            employee: request.employee,
            currentDate: date,
            type: attendanceType,
            leaveRequest: request._id,
          },
          createdBy,
        });
      } catch (error) {
        // AttendanceRecord.shift is required (HD-005) — an employee with no
        // default shift and none supplied here throws. A leave day with no
        // scheduled shift has nothing to excuse attendance-wise, so this is
        // skipped rather than failing the whole approval; every other
        // AttendanceRecord validation error still propagates normally.
        if (!/no default shift/i.test(error.message)) throw error;
      }
    }
  }

  /** Soft-deletes generated AttendanceRecord entries — all of them, or only those after `fromDate` (recall). */
  async reverseAttendanceRecords(request, brandId, fromDate = null) {
    const query = { brand: brandId, employee: request.employee, leaveRequest: request._id, isDeleted: false };
    if (fromDate) query.currentDate = { $gt: fromDate };

    const records = await attendanceRecordService.model.find(query).lean();
    for (const record of records) {
      await attendanceRecordService.softDelete({ id: String(record._id), brandId, deletedBy: request.approvedBy });
    }
  }

  // ===================== Payroll Integration =====================

  /**
   * Splits the unpaid range by calendar month (a leave spanning two months
   * gets two deduction transactions, each pro-rated against that month's
   * own day count) and creates one `EmployeeFinancialTransaction` per
   * month. Returns the last transaction created (for `relatedTransaction`)
   * — a leave spanning N months produces N transactions but this request
   * only links to one; the others are still discoverable via
   * `EmployeeFinancialTransaction.relatedAdvance`-style querying by
   * employee+payrollMonth (see module doc §12 for the multi-transaction
   * link limitation).
   */
  async processUnpaidDeduction({ request, brandId, branchId, createdBy }) {
    const profile = await this.findFinancialProfileForEmployee(request.employee, brandId);
    const basicSalary = profile?.compensation?.basicSalary;
    if (!basicSalary) return null; // fail-open: no financial profile, nothing to deduct against

    const attendanceSettings = await attendanceSettingsService.resolveForBranch(brandId, request.branch);
    const weeklyOffDays = attendanceSettings.settings.workCalendar.weeklyOffDays;
    const dates = enumerateDates(new Date(request.startDate), new Date(request.endDate)).filter((d) =>
      isWorkingDay(d, weeklyOffDays),
    );

    const byMonth = new Map();
    dates.forEach((date) => {
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      byMonth.set(key, (byMonth.get(key) || 0) + 1);
    });

    let lastTransaction = null;
    for (const [payrollMonth, unpaidDays] of byMonth.entries()) {
      const [year, month] = payrollMonth.split("-").map(Number);
      const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const amount = computeUnpaidDeductionAmount(basicSalary, unpaidDays, daysInMonth);
      if (amount <= 0) continue;

      lastTransaction = await employeeFinancialTransactionService.create({
        brandId,
        data: {
          branch: branchId || request.branch,
          employee: request.employee,
          category: "deduction",
          type: "salary_deduction",
          amount,
          payrollMonth,
          reason: `Unpaid leave deduction (${request.leaveType}, ${unpaidDays} day(s))`,
        },
        createdBy,
      });
    }

    return lastTransaction;
  }

  async processEncashment({ request, brandId, branchId, createdBy }) {
    const profile = await this.findFinancialProfileForEmployee(request.employee, brandId);
    const basicSalary = profile?.compensation?.basicSalary;
    if (!basicSalary) {
      throwError("Cannot encash leave — this employee has no financial profile with a basic salary set", 400);
    }

    const now = new Date();
    const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
    const amount = computeUnpaidDeductionAmount(basicSalary, request.totalDays, daysInMonth);

    return employeeFinancialTransactionService.create({
      brandId,
      data: {
        branch: branchId || request.branch,
        employee: request.employee,
        category: "earning",
        type: "leave_encashment",
        amount,
        payrollMonth: now.toISOString().slice(0, 7),
        reason: `Leave encashment (${request.leaveType}, ${request.totalDays} day(s))`,
      },
      createdBy,
    });
  }

  // ===================== Reports =====================

  async getBranchSummary(brandId) {
    const rows = await this.branchSummary(brandId);
    return rows.map((r) => ({ branch: r._id, count: r.count, totalDays: r.totalDays }));
  }

  async getDepartmentSummary(brandId) {
    const rows = await this.departmentSummary(brandId);
    return rows.map((r) => ({ department: r._id, count: r.count, totalDays: r.totalDays }));
  }

  async getTypeSummary(brandId) {
    const rows = await this.typeSummary(brandId);
    return rows.map((r) => ({ leaveType: r._id, count: r.count, totalDays: r.totalDays }));
  }

  async getPayrollImpactReport(brandId) {
    return this.payrollImpactSummary(brandId);
  }
}

export default new LeaveRequestService();
