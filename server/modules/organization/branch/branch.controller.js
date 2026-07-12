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

  // hardDelete/softDelete/bulkSoftDelete/bulkHardDelete/restore intentionally
  // NOT overridden here — they were near-verbatim reimplementations of
  // BaseController's own methods, with one real bug: this module's
  // softDelete/bulkSoftDelete passed `userId` instead of `deletedBy`, so
  // BranchRepository's softDelete/bulkSoftDelete (which expects `deletedBy`,
  // matching BaseController's real call shape) always received `undefined`
  // and silently recorded no actor on every branch deletion. Removed rather
  // than fixed in place — BaseController's inherited versions already do
  // exactly this, correctly.
}

export default new BranchController();
