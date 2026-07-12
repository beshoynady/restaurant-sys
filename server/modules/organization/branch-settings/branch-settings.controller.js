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

  getNextOpenTime = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const next = await branchSettingsService.getNextOpenTime({ branchId });

    res.json({ success: true, data: next });
  });

  getPublicSettings = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const settings = await branchSettingsService.getByBranch({ branchId });

    res.json({ success: true, data: settings });
  });

  // Single call for the dashboard settings screen — create-or-update in one
  // request, instead of forcing the frontend to GET first to decide whether
  // to POST or PUT. `upsert()` already existed in the service with no
  // controller/route ever calling it.
  upsertForBranch = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const { branchId } = req.params;

    const data = await branchSettingsService.upsert({ brandId, branchId, data: req.body, userId });

    res.json({ success: true, data });
  });
}

export default new BranchSettingsController();
