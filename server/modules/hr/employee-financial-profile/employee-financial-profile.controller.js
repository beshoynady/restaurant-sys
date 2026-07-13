import mongoose from "mongoose";
import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import throwError from "../../../utils/throwError.js";
import employeeFinancialProfileService from "./employee-financial-profile.service.js";

class EmployeeFinancialProfileController extends BaseController {
  constructor() {
    super(employeeFinancialProfileService);
  }

  validateEmployeeParam(employeeId) {
    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      throwError("A valid employee id is required", 400);
    }
  }

  // Financial identity is looked up by employee (1:1), not by the profile's
  // own id — the frontend always has an employee id in context, rarely the
  // profile id.
  getByEmployee = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    this.validateEmployeeParam(req.params.employeeId);

    const profile = await employeeFinancialProfileService.findForEmployee(req.params.employeeId, brandId);
    if (!profile) throwError("No financial profile exists for this employee", 404);

    res.json({ success: true, data: profile });
  });

  // Frontend Readiness: "Payroll Eligibility" — a go/no-go checklist.
  eligibility = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    this.validateEmployeeParam(req.params.employeeId);

    const profile = await employeeFinancialProfileService.findForEmployee(req.params.employeeId, brandId);
    const data = employeeFinancialProfileService.computePayrollEligibility(profile);

    res.json({ success: true, data });
  });

  // Frontend Readiness: "Financial Summary" — profile + eligibility in one call.
  summary = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    this.validateEmployeeParam(req.params.employeeId);

    const data = await employeeFinancialProfileService.getFinancialSummary(req.params.employeeId, brandId);

    res.json({ success: true, data });
  });
}

export default new EmployeeFinancialProfileController();
