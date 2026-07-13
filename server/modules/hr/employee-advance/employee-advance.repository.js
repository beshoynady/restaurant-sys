// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access
// for EmployeeAdvance. Previously this module had no repository file and no
// real service — see HD-012.
import mongoose from "mongoose";
import BaseRepository from "../../../utils/BaseRepository.js";
import EmployeeAdvanceModel from "./employee-advance.model.js";
import EmployeeModel from "../employee/employee.model.js";
import EmployeeFinancialProfileModel from "../employee-financial-profile/employee-financial-profile.model.js";

const ACTIVE_STATUSES = ["disbursed", "repayment_started", "partially_repaid"];

class EmployeeAdvanceRepository extends BaseRepository {
  constructor() {
    super(EmployeeAdvanceModel, {
      brandScoped: true,
      branchScoped: false,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "employee", "approvedBy", "createdBy", "updatedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  async findEmployeeForScope(employeeId, brandId) {
    return EmployeeModel.findOne({ _id: employeeId, brand: brandId, isDeleted: false })
      .select("branches department")
      .lean();
  }

  async findFinancialProfileForEmployee(employeeId, brandId) {
    return EmployeeFinancialProfileModel.findOne({ employee: employeeId, brand: brandId, isDeleted: false })
      .select("compensation")
      .lean();
  }

  /** One-active-advance-at-a-time guard (§5) — any advance currently mid-repayment or just disbursed. */
  async findActiveAdvanceForEmployee(employeeId, brandId, excludeId = null) {
    const query = { employee: employeeId, brand: brandId, status: { $in: ACTIVE_STATUSES }, isDeleted: false };
    if (excludeId) query._id = { $ne: excludeId };

    return this.model.findOne(query).lean();
  }

  async findActiveAdvancesForEmployee(employeeId, brandId) {
    return this.model
      .find({ employee: employeeId, brand: brandId, status: { $in: ACTIVE_STATUSES }, isDeleted: false })
      .lean();
  }

  /** Dashboard/report primitive: advance counts and outstanding totals grouped by status, for one branch. */
  async branchSummary(brandId, branchId) {
    const match = { brand: new mongoose.Types.ObjectId(brandId), isDeleted: false };
    if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);

    return this.model.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
          totalOutstanding: { $sum: "$remainingBalance" },
        },
      },
    ]);
  }

  /** Report primitive: advances grouped by department, joined through Employee. */
  async departmentSummary(brandId) {
    return this.model.aggregate([
      { $match: { brand: new mongoose.Types.ObjectId(brandId), isDeleted: false } },
      {
        $lookup: {
          from: "employees",
          localField: "employee",
          foreignField: "_id",
          as: "employeeDoc",
        },
      },
      { $unwind: "$employeeDoc" },
      {
        $group: {
          _id: "$employeeDoc.department",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
          totalOutstanding: { $sum: "$remainingBalance" },
        },
      },
    ]);
  }
}

export default EmployeeAdvanceRepository;
