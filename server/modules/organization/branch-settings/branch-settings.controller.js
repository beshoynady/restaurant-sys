import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import branchSettingsService from "./branch-settings.service.js";

/**
 * notes:
 * - hardDelete/bulkHardDelete/softDelete/restore/bulkSoftDelete are NOT
 *   overridden here — the inherited BaseController versions already do the
 *   right thing (brand/branch-scoped, correct object signature).
 */
class BranchSettingsController extends BaseController {
  constructor() {
    super(branchSettingsService);
  }

  isBranchOpen = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const isOpen = await branchSettingsService.isBranchOpen({ branchId });

    res.json({ success: true, data: { branchId, isOpen } });
  });

  isServiceAvailable = asyncHandler(async (req, res) => {
    const { branchId, serviceType } = req.params;
    const available = await branchSettingsService.isServiceAvailable({ branchId, serviceType });

    res.json({ success: true, data: { branchId, service: serviceType, available } });
  });

  getCurrentPeriod = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const period = await branchSettingsService.getCurrentPeriod({ branchId });

    res.json({ success: true, data: period });
  });

  getPublicSettings = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const settings = await branchSettingsService.getByBranch({ branchId });

    res.json({ success: true, data: settings });
  });
}

export default new BranchSettingsController();
