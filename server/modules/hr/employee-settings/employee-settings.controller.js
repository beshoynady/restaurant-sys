import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import employeeSettingsService from "./employee-settings.service.js";
import EmployeeSettingsModel from "./employee-settings.model.js";

class EmployeeSettingsController extends BaseController {
  constructor() {
    super(employeeSettingsService);
  }

  // Frontend Readiness: the brand's effective policy, or the schema's own
  // defaults if no document has been created yet — mirrors
  // hr/attendance-settings' GET /resolve so a frontend never has to special-
  // case "brand hasn't configured this yet".
  resolve = asyncHandler(async (req, res) => {
    const { brandId } = req.user;

    const settings = await employeeSettingsService.findForBrand(brandId);
    const source = settings ? "brand" : "schemaDefault";
    // `.toObject()` on an unsaved document just reads its schema defaults —
    // no validators run, so the missing `brand`/`createdBy` are harmless.
    const resolvedSettings = settings || new EmployeeSettingsModel().toObject();

    res.json({ success: true, data: { source, settings: resolvedSettings } });
  });
}

export default new EmployeeSettingsController();
