// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access
// for LeaveRequest. Previously this module had a hand-written service
// (create/findAll/findById/update/delete) incompatible with BaseController
// — same defect class HD-012 fixed for EmployeeAdvance.
import mongoose from "mongoose";
import BaseRepository from "../../../utils/BaseRepository.js";
import LeaveRequestModel from "./leave-request.model.js";
import EmployeeModel from "../employee/employee.model.js";
import EmployeeSettingsModel from "../employee-settings/employee-settings.model.js";
import EmployeeFinancialProfileModel from "../employee-financial-profile/employee-financial-profile.model.js";

class LeaveRequestRepository extends BaseRepository {
  constructor() {
    super(LeaveRequestModel, {
      brandScoped: true,
      branchScoped: false,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "department", "employee", "approvedBy", "createdBy", "updatedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  async findEmployeeForScope(employeeId, brandId) {
    return EmployeeModel.findOne({ _id: employeeId, brand: brandId, isDeleted: false })
      .select("branches department jobTitle shift hireDate")
      .lean();
  }

  async findEmployeeSettingsForBrand(brandId) {
    return EmployeeSettingsModel.findOne({ brand: brandId, isDeleted: false }).select("leavePolicy").lean();
  }

  async findFinancialProfileForEmployee(employeeId, brandId) {
    return EmployeeFinancialProfileModel.findOne({ employee: employeeId, brand: brandId, isDeleted: false })
      .select("compensation")
      .lean();
  }

  /** Sum of totalDays across approved (non-cancelled), non-encashment leave requests for one employee/type/date-range. */
  async sumApprovedDays({ brandId, employeeId, leaveType, rangeStart, rangeEnd, excludeId = null }) {
    const match = {
      brand: new mongoose.Types.ObjectId(brandId),
      employee: new mongoose.Types.ObjectId(employeeId),
      leaveType,
      requestKind: "leave",
      status: { $in: ["approved", "completed", "closed"] },
      startDate: { $gte: rangeStart, $lte: rangeEnd },
      isDeleted: false,
    };
    if (excludeId) match._id = { $ne: new mongoose.Types.ObjectId(excludeId) };

    const [result] = await this.model.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: "$totalDays" } } }]);
    return result?.total || 0;
  }

  /** Sum of days already encashed for one employee/type/date-range. */
  async sumEncashedDays({ brandId, employeeId, leaveType, rangeStart, rangeEnd }) {
    const match = {
      brand: new mongoose.Types.ObjectId(brandId),
      employee: new mongoose.Types.ObjectId(employeeId),
      leaveType,
      requestKind: "encashment",
      status: { $in: ["approved", "completed", "closed"] },
      startDate: { $gte: rangeStart, $lte: rangeEnd },
      isDeleted: false,
    };

    const [result] = await this.model.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: "$totalDays" } } }]);
    return result?.total || 0;
  }

  /** Every employee in `departmentId` with an active (non-terminated-status) Employee record — coverage denominator. */
  async countActiveDepartmentHeadcount(departmentId, brandId) {
    return EmployeeModel.countDocuments({
      department: departmentId,
      brand: brandId,
      isDeleted: false,
      status: { $nin: ["terminated", "resigned", "retired", "archived"] },
    });
  }

  /** How many employees in `departmentId` have an approved leave overlapping [startDate,endDate], excluding `excludeEmployeeId`. */
  async countOverlappingApprovedLeaves({ departmentId, brandId, startDate, endDate, excludeEmployeeId, excludeId = null }) {
    const match = {
      brand: new mongoose.Types.ObjectId(brandId),
      department: departmentId,
      requestKind: "leave",
      status: { $in: ["approved", "manager_review", "hr_review"] },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
      employee: { $ne: new mongoose.Types.ObjectId(excludeEmployeeId) },
      isDeleted: false,
    };
    if (excludeId) match._id = { $ne: new mongoose.Types.ObjectId(excludeId) };

    return this.model.countDocuments(match);
  }

  /** Report primitive: counts/day-totals grouped by branch. */
  async branchSummary(brandId) {
    return this.model.aggregate([
      { $match: { brand: new mongoose.Types.ObjectId(brandId), isDeleted: false } },
      { $group: { _id: "$branch", count: { $sum: 1 }, totalDays: { $sum: "$totalDays" } } },
    ]);
  }

  /** Report primitive: counts/day-totals grouped by department. */
  async departmentSummary(brandId) {
    return this.model.aggregate([
      { $match: { brand: new mongoose.Types.ObjectId(brandId), isDeleted: false } },
      { $group: { _id: "$department", count: { $sum: 1 }, totalDays: { $sum: "$totalDays" } } },
    ]);
  }

  /** Report primitive: counts/day-totals grouped by leave type. */
  async typeSummary(brandId) {
    return this.model.aggregate([
      { $match: { brand: new mongoose.Types.ObjectId(brandId), isDeleted: false } },
      { $group: { _id: "$leaveType", count: { $sum: 1 }, totalDays: { $sum: "$totalDays" } } },
    ]);
  }

  /** Report primitive: approved requests that had a real payroll effect (unpaid deduction or encashment). */
  async payrollImpactSummary(brandId) {
    return this.model
      .find({
        brand: brandId,
        payrollProcessed: true,
        isDeleted: false,
      })
      .populate(["employee", "relatedTransaction"])
      .select("employee leaveType requestKind totalDays payrollTreatment relatedTransaction status")
      .lean();
  }
}

export default LeaveRequestRepository;
