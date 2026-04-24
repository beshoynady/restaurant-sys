import BaseController from "../../../utils/BaseController.js";
import branchService from "./branch.service.js";
import asyncHandler from "../../../utils/asyncHandler.js";

class BranchController extends BaseController {
  constructor() {
    super(branchService);
  }

  setMainBranch = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;

    const data = await this.service.setMainBranch({
      id: req.params.id,
      brandId,
      userId,
    });

    res.json({
      success: true,
      data,
    });
  });

  getAllBranches = asyncHandler(async (req, res) => {
    const { brandId } = req.user;

    const result = await this.service.getAllBranches({
      brandId,
      query: req.query,
    });

    res.json(result);
  });
}

export default new BranchController();