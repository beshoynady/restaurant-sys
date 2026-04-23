// controllers/core/branch-settings.controller.js

import BaseController from "../../../utils/BaseController.js";
import branchSettingsService from "../../services/core/branch-settings.service.js";
import asyncHandler from "../../../utils/asyncHandler.js";

/**
 * BranchSettingsController
 */
class BranchSettingsController extends BaseController {
  constructor() {
    super(branchSettingsService);
  }

  // =====================================================
  // 🔹 CHECK IF BRANCH IS OPEN
  // =====================================================
  isBranchOpen = asyncHandler(async (req, res) => {
    const { branchId } = req.params;

    const isOpen = await this.service.isBranchOpen(branchId);

    res.json({
      success: true,
      isOpen,
    });
  });

  // =====================================================
  // 🔹 CHECK SERVICE AVAILABILITY
  // =====================================================
  isServiceAvailable = asyncHandler(async (req, res) => {
    const { branchId, serviceType } = req.params;

    const available = await this.service.isServiceAvailable(
      branchId,
      serviceType
    );

    res.json({
      success: true,
      service: serviceType,
      available,
    });
  });

  // =====================================================
  // 🔹 GET CURRENT PERIOD
  // =====================================================
  getCurrentPeriod = asyncHandler(async (req, res) => {
    const { branchId } = req.params;

    const period = await this.service.getCurrentPeriod(branchId);

    res.json({
      success: true,
      data: period,
    });
  });
}

export default new BranchSettingsController();