import mongoose from "mongoose";
import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import throwError from "../../../utils/throwError.js";
import attendanceSettingsService from "./attendance-settings.service.js";

class AttendanceSettingsController extends BaseController {
  constructor() {
    super(attendanceSettingsService);
  }

  // Frontend Readiness (module doc §7): a single "policy summary" endpoint so
  // no consumer has to reimplement the branch-override -> brand-default ->
  // hard-default fallback logic client-side.
  resolve = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch } = req.query;

    if (branch && !mongoose.Types.ObjectId.isValid(branch)) {
      throwError("Invalid branch id", 400);
    }

    const result = await attendanceSettingsService.resolveForBranch(brandId, branch || null);

    res.json({ success: true, data: result });
  });
}

export default new AttendanceSettingsController();
