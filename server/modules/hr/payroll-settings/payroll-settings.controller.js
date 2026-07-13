import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import payrollSettingsService from "./payroll-settings.service.js";
import PayrollSettingsModel from "./payroll-settings.model.js";

class PayrollSettingsController extends BaseController {
  constructor() {
    super(payrollSettingsService);
  }

  // Frontend Readiness: effective policy, or schema defaults if no document
  // exists yet — same "resolve" pattern as AttendanceSettings/EmployeeSettings.
  resolve = asyncHandler(async (req, res) => {
    const { brandId } = req.user;

    const settings = await payrollSettingsService.findForBrand(brandId);
    const source = settings ? "brand" : "schemaDefault";
    const resolvedSettings = settings || new PayrollSettingsModel().toObject();

    res.json({ success: true, data: { source, settings: resolvedSettings } });
  });
}

export default new PayrollSettingsController();
