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

  hardDelete = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const data = await this.service.hardDelete({
      id: req.params.id,
      brandId,
      userId,
    });
  });
  softDelete = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const data = await this.service.softDelete({
      id: req.params.id,
      brandId,
      userId,
    });
    res.json({ success: true, data });
    });
  
    bulkSoftDelete = asyncHandler(async (req, res) => {
      const { brandId, userId } = req.user;
      const data = await this.service.bulkSoftDelete({
        ids: req.body.ids,
        brandId,
        userId,
      });
      res.json({ success: true, data });
    }
  );

  bulkHardDelete = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const data = await this.service.bulkHardDelete({
      ids: req.body.ids,
      brandId,
      userId,
    });
    res.json({ success: true, data });
  });

  restore = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const data = await this.service.restore({
      id: req.params.id,
      brandId,
      userId,
    });
    res.json({ success: true, data });
  })

}

export default new BranchController();