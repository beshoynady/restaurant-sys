import { Request, Response } from "express";
import BaseController from "../../../utils/BaseController.js";
import asyncHandlerJs from "../../../utils/asyncHandler.js";
import branchSettingsService from "./branch-settings.service.js";

const asyncHandler = asyncHandlerJs as (
  fn: (req: Request, res: Response) => Promise<void>,
) => (req: Request, res: Response, next: (err?: unknown) => void) => void;

/**
 * notes:
 * - hardDelete/bulkHardDelete/softDelete/restore/bulkSoftDelete are NOT
 *   overridden here — the inherited BaseController versions already do the
 *   right thing (brand/branch-scoped, correct object signature).
 */
class BranchSettingsController extends BaseController<typeof branchSettingsService> {
  constructor() {
    super(branchSettingsService);
  }

  isBranchOpen = asyncHandler(async (req: Request, res: Response) => {
    const { branchId } = req.params;
    const isOpen = await branchSettingsService.isBranchOpen({ branchId });

    res.json({ success: true, data: { branchId, isOpen } });
  });

  isServiceAvailable = asyncHandler(async (req: Request, res: Response) => {
    const { branchId, serviceType } = req.params as { branchId: string; serviceType: any };
    const available = await branchSettingsService.isServiceAvailable({ branchId, serviceType });

    res.json({ success: true, data: { branchId, service: serviceType, available } });
  });

  getCurrentPeriod = asyncHandler(async (req: Request, res: Response) => {
    const { branchId } = req.params;
    const period = await branchSettingsService.getCurrentPeriod({ branchId });

    res.json({ success: true, data: period });
  });

  getPublicSettings = asyncHandler(async (req: Request, res: Response) => {
    const { branchId } = req.params;
    const settings = await branchSettingsService.getByBranch({ branchId });

    res.json({ success: true, data: settings });
  });
}

export default new BranchSettingsController();
