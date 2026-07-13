// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only —
// every database operation delegates to a method inherited from (or added
// on) attendance-record.repository.js. This is the HD-008 wiring point:
// AttendanceRecord previously trusted whatever isLate/lateMinutes/isOvertime/
// ... a client sent; every derived field is now computed here from the
// resolved AttendanceSettings policy (attendance-settings.service.js) and
// the pure functions in attendance-record.domain.js.
import throwError from "../../../utils/throwError.js";
import AttendanceRecordRepository from "./attendance-record.repository.js";
import attendanceSettingsService from "../attendance-settings/attendance-settings.service.js";
import { evaluateAttendance } from "./attendance-record.domain.js";

const COMPUTED_FIELDS = [
  "isLate",
  "lateMinutes",
  "leftEarly",
  "earlyMinutes",
  "isOvertime",
  "overtimeMinutes",
  "totalWorkedMinutes",
  "totalAbsentMinutes",
];

class AttendanceRecordService extends AttendanceRecordRepository {
  /**
   * HD-005 part 2: Employee.shift is optional (an employee may have no
   * standing default shift), but AttendanceRecord.shift is required — a
   * shift actually worked that day must always be knowable. Falls back to
   * the employee's default shift; if neither exists, fails with a message
   * that tells the caller exactly what to do, instead of a raw Mongoose
   * "shift is required" error.
   */
  resolveShiftId(data, employee) {
    const shiftId = data.shift || employee.shift;

    if (!shiftId) {
      throwError(
        "This employee has no default shift assigned — specify a shift explicitly for this attendance record",
        400,
      );
    }

    return shiftId;
  }

  async assertEmployeeWorksAtBranch(employee, branchId) {
    const belongs = (employee.branches || []).some((b) => String(b) === String(branchId));
    if (!belongs) {
      throwError("This employee is not assigned to the selected branch", 400);
    }
  }

  async assertShiftBelongsToBranch(shift, branchId) {
    if (!shift) {
      throwError("Shift not found", 404);
    }
    if (String(shift.branch) !== String(branchId)) {
      throwError("The selected shift does not belong to the selected branch", 400);
    }
  }

  async assertLeaveRequestConsistent(leaveRequestId, employeeId, brandId) {
    if (!leaveRequestId) return;

    const leaveRequest = await this.findLeaveRequestForScope(leaveRequestId, brandId);
    if (!leaveRequest) {
      throwError("Leave request not found", 404);
    }
    if (String(leaveRequest.employee) !== String(employeeId)) {
      throwError("This leave request does not belong to the selected employee", 400);
    }
    if (leaveRequest.status !== "approved") {
      throwError("Only an approved leave request can be linked to an attendance record", 400);
    }
  }

  async assertSourceAllowed(source, policy) {
    if (source && !policy.attendanceSource[source]) {
      throwError(`Attendance source "${source}" is not enabled by policy for this branch`, 400);
    }
  }

  /** Strips server-computed fields so a client-sent value never survives into the DB. */
  stripComputedFields(payload) {
    const clean = { ...payload };
    COMPUTED_FIELDS.forEach((field) => delete clean[field]);
    return clean;
  }

  async beforeCreate(data) {
    const employee = await this.findEmployeeForScope(data.employee, data.brand);
    if (!employee) {
      throwError("Employee not found", 404);
    }

    await this.assertEmployeeWorksAtBranch(employee, data.branch);

    const shiftId = this.resolveShiftId(data, employee);
    const shift = await this.findShiftForScope(shiftId, data.brand);
    await this.assertShiftBelongsToBranch(shift, data.branch);

    await this.assertLeaveRequestConsistent(data.leaveRequest, data.employee, data.brand);

    const { settings: policy } = await attendanceSettingsService.resolveForBranch(data.brand, data.branch);
    await this.assertSourceAllowed(data.source, policy);

    const computed = evaluateAttendance({
      arrivalTime: data.arrivalTime,
      departureTime: data.departureTime,
      shift,
      policy,
    });

    return { ...this.stripComputedFields(data), shift: shiftId, ...computed };
  }

  /**
   * Overridden (not just beforeUpdate) because recomputing lateness/overtime
   * on a partial update requires the existing document merged with the
   * incoming changes — beforeUpdate only ever sees the incoming payload,
   * not what's already stored.
   */
  async update(opts) {
    this.validateObjectId(opts.id);

    const existing = await this.model.findOne({ _id: opts.id, brand: opts.brandId, isDeleted: false }).lean();
    if (!existing) {
      throwError("Resource not found", 404);
    }

    const merged = { ...existing, ...opts.data };

    if (opts.data.employee || opts.data.branch) {
      const employee = await this.findEmployeeForScope(merged.employee, opts.brandId);
      if (!employee) {
        throwError("Employee not found", 404);
      }
      await this.assertEmployeeWorksAtBranch(employee, merged.branch);
    }

    const shift = await this.findShiftForScope(merged.shift, opts.brandId);
    await this.assertShiftBelongsToBranch(shift, merged.branch);

    if (opts.data.leaveRequest) {
      await this.assertLeaveRequestConsistent(opts.data.leaveRequest, merged.employee, opts.brandId);
    }

    const { settings: policy } = await attendanceSettingsService.resolveForBranch(opts.brandId, merged.branch);
    if (opts.data.source) {
      await this.assertSourceAllowed(opts.data.source, policy);
    }

    const computed = evaluateAttendance({
      arrivalTime: merged.arrivalTime,
      departureTime: merged.departureTime,
      shift,
      policy,
    });

    return super.update({ ...opts, data: { ...this.stripComputedFields(opts.data), ...computed } });
  }
}

export default new AttendanceRecordService();
