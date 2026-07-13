import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import jobTitleService from "./job-title.service.js";

class JobTitleController extends BaseController {
  constructor() {
    super(jobTitleService);
  }

  // "Positions per department" dashboard/reporting need.
  countByDepartment = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const data = await jobTitleService.countActiveByDepartment(brandId);

    res.json({ success: true, data });
  });
}

export default new JobTitleController();
