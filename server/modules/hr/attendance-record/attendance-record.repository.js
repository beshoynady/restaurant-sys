// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access for
// AttendanceRecord. Previously this module had no repository file at all —
// attendance-record.service.js instantiated BaseRepository directly under
// the name "AdvancedService" (a stale name from before the BaseService ->
// BaseRepository rename), violating the mandatory Repository Pattern.
import mongoose from "mongoose";
import BaseRepository from "../../../utils/BaseRepository.js";
import AttendanceRecordModel from "./attendance-record.model.js";
import EmployeeModel from "../employee/employee.model.js";
import ShiftModel from "../shift/shift.model.js";
import LeaveRequestModel from "../leave-request/leave-request.model.js";

class AttendanceRecordRepository extends BaseRepository {
  constructor() {
    super(AttendanceRecordModel, {
      brandScoped: true,
      // Not branch-isolating at the repository level: `branch` is validated
      // against the employee's own `branches` array in the service instead
      // (an employee legitimately clocking in at any branch they're
      // assigned to, not just req.user's current branch).
      branchScoped: false,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "employee", "shift", "leaveRequest", "createdBy", "updatedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  async findEmployeeForScope(employeeId, brandId) {
    return EmployeeModel.findOne({ _id: employeeId, brand: brandId, isDeleted: false })
      .select("branches defaultBranch shift status")
      .lean();
  }

  async findShiftForScope(shiftId, brandId) {
    return ShiftModel.findOne({ _id: shiftId, brand: brandId, isDeleted: false }).lean();
  }

  async findLeaveRequestForScope(leaveRequestId, brandId) {
    return LeaveRequestModel.findOne({ _id: leaveRequestId, brand: brandId }).lean();
  }

  /**
   * One month's totals for one employee — the "ready-to-use" summary
   * Payroll (module 15) and any HR dashboard need, so neither has to
   * re-aggregate raw AttendanceRecord rows itself.
   */
  async monthlySummary({ brandId, employeeId, year, month }) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const [totals] = await this.model.aggregate([
      {
        $match: {
          brand: new mongoose.Types.ObjectId(brandId),
          employee: new mongoose.Types.ObjectId(employeeId),
          isDeleted: false,
          currentDate: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: null,
          totalWorkedMinutes: { $sum: "$totalWorkedMinutes" },
          totalAbsentMinutes: { $sum: "$totalAbsentMinutes" },
          totalLateMinutes: { $sum: "$lateMinutes" },
          totalOvertimeMinutes: { $sum: "$overtimeMinutes" },
          daysPresent: { $sum: { $cond: [{ $in: ["$type", ["PRESENT", "PARTIAL", "WORK_ON_HOLIDAY"]] }, 1, 0] } },
          daysAbsent: { $sum: { $cond: [{ $eq: ["$type", "ABSENT"] }, 1, 0] } },
          daysOnLeave: { $sum: { $cond: [{ $in: ["$type", ["VACATION", "SICK_LEAVE", "PERMISSION"] ] }, 1, 0] } },
          lateOccurrences: { $sum: { $cond: ["$isLate", 1, 0] } },
          overtimeOccurrences: { $sum: { $cond: ["$isOvertime", 1, 0] } },
          recordCount: { $sum: 1 },
        },
      },
    ]);

    return (
      totals || {
        totalWorkedMinutes: 0,
        totalAbsentMinutes: 0,
        totalLateMinutes: 0,
        totalOvertimeMinutes: 0,
        daysPresent: 0,
        daysAbsent: 0,
        daysOnLeave: 0,
        lateOccurrences: 0,
        overtimeOccurrences: 0,
        recordCount: 0,
      }
    );
  }
}

export default AttendanceRecordRepository;
