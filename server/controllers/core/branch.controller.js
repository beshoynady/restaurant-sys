import BaseController from "../../utils/BaseController.js";
import branchService from "../../services/core/branch.service.js";

class BranchController extends BaseController {
  constructor() {
    super(branchService);
  }
}

export default new BranchController();
