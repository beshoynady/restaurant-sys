import mongoose from "mongoose";
import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import throwError from "../../../utils/throwError.js";
import leaveRequestService, { PENDING_REVIEW_STATUSES } from "./leave-request.service.js";

function requireObjectId(value, label) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) throwError(`A valid ${label} is required`, 400);
}

class LeaveRequestController extends BaseController {
  constructor() {
    super(leaveRequestService);
  }

  // ===================== Workflow =====================

  submit = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const data = await leaveRequestService.submit({ id: req.params.id, brandId, submittedBy: userId });
    res.json({ success: true, message: "Leave request submitted", data });
  });

  managerReview = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const { decision, comment } = req.body || {};
    if (!["approved", "rejected"].includes(decision)) throwError('decision must be "approved" or "rejected"', 400);

    const data = await leaveRequestService.managerReview({ id: req.params.id, brandId, reviewedBy: userId, decision, comment });
    res.json({ success: true, message: "Manager review recorded", data });
  });

  hrReview = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const { decision, comment } = req.body || {};
    if (!["approved", "rejected"].includes(decision)) throwError('decision must be "approved" or "rejected"', 400);

    const data = await leaveRequestService.hrReview({
      id: req.params.id,
      brandId,
      branchId,
      reviewedBy: userId,
      decision,
      comment,
      createdBy: userId,
    });
    res.json({ success: true, message: "HR review recorded", data });
  });

  cancel = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const data = await leaveRequestService.cancel({
      id: req.params.id,
      brandId,
      cancelledBy: userId,
      cancellationReason: req.body?.cancellationReason,
    });
    res.json({ success: true, message: "Leave request cancelled", data });
  });

  complete = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const data = await leaveRequestService.complete({ id: req.params.id, brandId });
    res.json({ success: true, message: "Leave request completed", data });
  });

  close = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const data = await leaveRequestService.close({ id: req.params.id, brandId, closedBy: userId });
    res.json({ success: true, message: "Leave request closed", data });
  });

  recall = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const { newEndDate, recallReason } = req.body || {};
    if (!newEndDate) throwError("newEndDate is required", 400);

    const data = await leaveRequestService.recall({ id: req.params.id, brandId, recalledBy: userId, newEndDate, recallReason });
    res.json({ success: true, message: "Employee recalled from leave", data });
  });

  // ===================== Balance / Frontend-ready reads =====================

  balance = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    requireObjectId(req.params.employeeId, "employee id");
    const { leaveType } = req.query;
    if (!leaveType) throwError("leaveType query param is required", 400);

    const data = await leaveRequestService.getLeaveBalance(req.params.employeeId, brandId, leaveType);
    res.json({ success: true, data });
  });

  balances = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    requireObjectId(req.params.employeeId, "employee id");

    const data = await leaveRequestService.getAllLeaveBalances(req.params.employeeId, brandId);
    res.json({ success: true, data });
  });

  history = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    requireObjectId(req.params.employeeId, "employee id");

    const data = await leaveRequestService.getAll({
      brandId,
      filters: { employee: req.params.employeeId },
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
    });
    res.json({ success: true, data: data.data, meta: data.pagination });
  });

  pending = asyncHandler(async (req, res) => {
    const { brandId } = req.user;

    const data = await leaveRequestService.getAll({
      brandId,
      filters: { status: { $in: PENDING_REVIEW_STATUSES } },
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 100,
    });
    res.json({ success: true, data: data.data, meta: data.pagination });
  });

  // Team/department calendar — every leave overlapping the requested range,
  // pre-filtered so the frontend never post-processes a raw list itself.
  calendar = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { department, branch, from, to } = req.query;
    if (!from || !to) throwError("from and to (dates) are required", 400);

    const filters = {
      status: { $in: ["approved", "completed"] },
      startDate: { $lte: new Date(to) },
      endDate: { $gte: new Date(from) },
    };
    if (department) filters.department = department;
    if (branch) filters.branch = branch;

    const data = await leaveRequestService.getAll({ brandId, filters, page: 1, limit: 500 });
    res.json({ success: true, data: data.data });
  });

  upcoming = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const days = Number(req.query.days) || 30;
    const now = new Date();
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const data = await leaveRequestService.getAll({
      brandId,
      filters: { status: "approved", startDate: { $gte: now, $lte: until } },
      page: 1,
      limit: 200,
      sort: { startDate: 1 },
    });
    res.json({ success: true, data: data.data });
  });

  // ===================== Reports =====================

  branchSummary = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    res.json({ success: true, data: await leaveRequestService.getBranchSummary(brandId) });
  });

  departmentSummary = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    res.json({ success: true, data: await leaveRequestService.getDepartmentSummary(brandId) });
  });

  typeSummary = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    res.json({ success: true, data: await leaveRequestService.getTypeSummary(brandId) });
  });

  payrollImpact = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    res.json({ success: true, data: await leaveRequestService.getPayrollImpactReport(brandId) });
  });
}

export default new LeaveRequestController();
