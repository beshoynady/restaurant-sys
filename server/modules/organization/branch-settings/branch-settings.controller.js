// controllers/core/branch-settings.controller.js

import BaseController from "../../../utils/BaseController.js";
import branchSettingsService from "./branch-settings.service.js";
import asyncHandler from "../../../utils/asyncHandler.js";

/**
 * BranchSettingsController
 */
class BranchSettingsController extends BaseController {
  constructor() {
    super(branchSettingsService);
  }

  // =====================================================
  // 🌍 PUBLIC: CHECK IF BRANCH IS OPEN
  // =====================================================
  isBranchOpen = asyncHandler(async (req, res) => {
    const { branchId } = req.params;

    const isOpen = await this.service.isBranchOpen(branchId);

    res.json({
      success: true,
      data: {
        branchId,
        isOpen,
      },
    });
  });

  // =====================================================
  // 🌍 PUBLIC: CHECK SERVICE AVAILABILITY
  // =====================================================
  isServiceAvailable = asyncHandler(async (req, res) => {
    const { branchId, serviceType } = req.params;

    const available = await this.service.isServiceAvailable(
      branchId,
      serviceType
    );

    res.json({
      success: true,
      data: {
        branchId,
        service: serviceType,
        available,
      },
    });
  });

  // =====================================================
  // 🌍 PUBLIC: GET CURRENT PERIOD
  // =====================================================
  getCurrentPeriod = asyncHandler(async (req, res) => {
    const { branchId } = req.params;

    const period = await this.service.getCurrentPeriod(branchId);

    res.json({
      success: true,
      data: period,
    });
  });

  // =====================================================
  // 🌍 PUBLIC: GET FULL SETTINGS FOR MENU
  // =====================================================
  getPublicSettings = asyncHandler(async (req, res) => {
    const { branchId } = req.params;

    const settings = await this.service.getByBranch(branchId);

    res.json({
      success: true,
      data: settings,
    });
  });

  hardDelete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    await this.service.hardDelete(id);
    res.json({
      success: true,
      message: "Branch settings permanently deleted",
    }); 
  });
  bulkHardDelete = asyncHandler(async (req, res) => {
    const { ids } = req.body; // Expecting an array of IDs in the request body
    
    await this.service.bulkHardDelete(ids);
    res.json({
      success: true,
      message: "Branch settings permanently deleted",
    });
  });

  softDelete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    await this.service.softDelete(id);
    res.json({
      success: true,
      message: "Branch settings soft deleted",
    }); 
  });
restore = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    await this.service.restore(id);
    res.json({
      success: true,
      message: "Branch settings restored",
    }); 
  }
);

  bulkSoftDelete = asyncHandler(async (req, res) => {
    const { ids } = req.body; // Expecting an array of IDs in the request body
    
    await this.service.bulkSoftDelete(ids);
    res.json({
      success: true,
      message: "Branch settings soft deleted",
    });
  });

}

export default new BranchSettingsController();