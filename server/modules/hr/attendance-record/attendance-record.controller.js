import mongoose from "mongoose";
import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import throwError from "../../../utils/throwError.js";
import attendanceRecordService from "./attendance-record.service.js";

class AttendanceRecordController extends BaseController {
  constructor() {
    super(attendanceRecordService);
  }

  // Frontend Readiness: one aggregated "ready-to-use" endpoint so neither
  // the frontend nor Payroll (module 15, once built) has to re-sum raw
  // AttendanceRecord rows itself.
  monthlySummary = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { employee, year, month } = req.query;

    if (!employee || !mongoose.Types.ObjectId.isValid(employee)) {
      throwError("A valid employee id is required", 400);
    }

    const yearNum = Number(year);
    const monthNum = Number(month);
    if (!yearNum || !monthNum || monthNum < 1 || monthNum > 12) {
      throwError("A valid year and month (1-12) are required", 400);
    }

    const data = await attendanceRecordService.monthlySummary({
      brandId,
      employeeId: employee,
      year: yearNum,
      month: monthNum,
    });

    res.json({ success: true, data });
  });
}

export default new AttendanceRecordController();
