import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import branchService from "./branch.service.js";

class BranchController extends BaseController {
  constructor() {
    super(branchService);
  }

  setMainBranch = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;

    const data = await branchService.setMainBranch({
      id: req.params.id,
      brandId,
      userId,
    });

    res.json({ success: true, data });
  });

  getAllBranches = asyncHandler(async (req, res) => {
    const { brandId } = req.user;

    const result = await branchService.getAllBranches({
      brandId,
      query: req.query,
    });

    res.json(result);
  });

  hardDelete = asyncHandler(async (req, res) => {
    const { brandId } = req.user;

    const data = await branchService.hardDelete({
      id: req.params.id,
      brandId,
    });

    res.json({ success: true, data, message: "Branch permanently deleted" });
  });

  softDelete = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;

    const data = await branchService.softDelete({
      id: req.params.id,
      brandId,
      userId,
    });

    res.json({ success: true, data });
  });

  bulkSoftDelete = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;

    const data = await branchService.bulkSoftDelete({
      ids: req.body.ids,
      brandId,
      userId,
    });

    res.json({ success: true, data });
  });

  bulkHardDelete = asyncHandler(async (req, res) => {
    const { brandId } = req.user;

    const data = await branchService.bulkHardDelete({
      ids: req.body.ids,
      brandId,
    });

    res.json({ success: true, data });
  });

  restore = asyncHandler(async (req, res) => {
    const { brandId } = req.user;

    const data = await branchService.restore({
      id: req.params.id,
      brandId,
    });

    res.json({ success: true, data });
  });
}

export default new BranchController();
