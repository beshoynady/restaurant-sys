import mongoose from "mongoose";
import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import throwError from "../../../utils/throwError.js";
import employeeFinancialTransactionService from "./employee-financial-transaction.service.js";

class EmployeeFinancialTransactionController extends BaseController {
  constructor() {
    super(employeeFinancialTransactionService);
  }

  approve = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;

    const data = await employeeFinancialTransactionService.approve({
      id: req.params.id,
      brandId,
      approvedBy: userId,
    });

    res.json({ success: true, message: "Transaction approved", data });
  });

  cancel = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;

    const data = await employeeFinancialTransactionService.cancel({
      id: req.params.id,
      brandId,
      cancelledBy: userId,
      cancellationReason: req.body?.cancellationReason,
    });

    res.json({ success: true, message: "Transaction cancelled", data });
  });

  // Frontend Readiness / Payroll-first: monthly totals ready to feed a
  // payslip preview or a payroll-prep dashboard — no client-side summing.
  monthlySummary = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { employee, payrollMonth } = req.query;

    if (!employee || !mongoose.Types.ObjectId.isValid(employee)) {
      throwError("A valid employee id is required", 400);
    }
    if (!payrollMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(String(payrollMonth))) {
      throwError('payrollMonth is required in "YYYY-MM" format', 400);
    }

    const data = await employeeFinancialTransactionService.monthlySummary({
      brandId,
      employeeId: employee,
      payrollMonth,
    });

    res.json({ success: true, data });
  });
}

export default new EmployeeFinancialTransactionController();
