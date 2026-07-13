import mongoose from "mongoose";
import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import throwError from "../../../utils/throwError.js";
import employeeAdvanceService from "./employee-advance.service.js";

function validateObjectIdParam(value, label = "id") {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    throwError(`A valid ${label} is required`, 400);
  }
}

class EmployeeAdvanceController extends BaseController {
  constructor() {
    super(employeeAdvanceService);
  }

  submit = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const data = await employeeAdvanceService.submit({ id: req.params.id, brandId, submittedBy: userId });
    res.json({ success: true, message: "Advance submitted", data });
  });

  review = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const data = await employeeAdvanceService.review({ id: req.params.id, brandId, reviewedBy: userId });
    res.json({ success: true, message: "Advance under review", data });
  });

  approve = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const data = await employeeAdvanceService.approve({ id: req.params.id, brandId, approvedBy: userId });
    res.json({ success: true, message: "Advance approved", data });
  });

  reject = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const data = await employeeAdvanceService.reject({
      id: req.params.id,
      brandId,
      rejectedBy: userId,
      rejectionReason: req.body?.rejectionReason,
    });
    res.json({ success: true, message: "Advance rejected", data });
  });

  disburse = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const data = await employeeAdvanceService.disburse({
      id: req.params.id,
      brandId,
      disbursedBy: userId,
      disbursementMethod: req.body?.disbursementMethod,
    });
    res.json({ success: true, message: "Advance disbursed", data });
  });

  cancel = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const data = await employeeAdvanceService.cancel({
      id: req.params.id,
      brandId,
      cancelledBy: userId,
      cancellationReason: req.body?.cancellationReason,
    });
    res.json({ success: true, message: "Advance cancelled", data });
  });

  recordRepayment = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const { amount, payrollId, payrollMonth } = req.body || {};

    if (!amount || amount <= 0) throwError("A positive repayment amount is required", 400);

    const data = await employeeAdvanceService.recordRepayment({
      id: req.params.id,
      brandId,
      branchId,
      amount,
      payrollId,
      payrollMonth,
      createdBy: userId,
    });
    res.json({ success: true, message: "Repayment recorded", data });
  });

  pauseDeductions = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const data = await employeeAdvanceService.pauseDeductions({ id: req.params.id, brandId });
    res.json({ success: true, message: "Deductions paused", data });
  });

  resumeDeductions = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const data = await employeeAdvanceService.resumeDeductions({ id: req.params.id, brandId });
    res.json({ success: true, message: "Deductions resumed", data });
  });

  close = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const data = await employeeAdvanceService.close({ id: req.params.id, brandId, closedBy: userId });
    res.json({ success: true, message: "Advance closed", data });
  });

  settleOnTermination = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const { method, payrollId } = req.body || {};

    if (!["waived", "deductedFromFinalPay"].includes(method)) {
      throwError('method must be "waived" or "deductedFromFinalPay"', 400);
    }

    const data = await employeeAdvanceService.settleOnTermination({
      id: req.params.id,
      brandId,
      branchId,
      method,
      settledBy: userId,
      payrollId,
      createdBy: userId,
    });
    res.json({ success: true, message: "Advance settled", data });
  });

  schedule = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const advance = await employeeAdvanceService.loadOr404(req.params.id, brandId);
    const data = employeeAdvanceService.getInstallmentSchedule(advance);
    res.json({ success: true, data });
  });

  payrollPreview = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    validateObjectIdParam(req.params.employeeId, "employee id");

    const data = await employeeAdvanceService.getPayrollDeductionPreview(req.params.employeeId, brandId);
    res.json({ success: true, data });
  });

  employeeSummary = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    validateObjectIdParam(req.params.employeeId, "employee id");

    const data = await employeeAdvanceService.getEmployeeAdvanceSummary(req.params.employeeId, brandId);
    res.json({ success: true, data });
  });

  branchSummary = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const data = await employeeAdvanceService.getBranchSummary(brandId, req.query.branch);
    res.json({ success: true, data });
  });

  departmentSummary = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const data = await employeeAdvanceService.getDepartmentSummary(brandId);
    res.json({ success: true, data });
  });

  overdue = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const data = await employeeAdvanceService.getOverdueAdvances(brandId);
    res.json({ success: true, data });
  });
}

export default new EmployeeAdvanceController();
