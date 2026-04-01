import BaseController from "../BaseController.js";
import branchSettingsService from "../../services/core/branch-settings.service.js";

class BranchSettingsController extends BaseController {
  constructor() {
    super(branchSettingsService);
  }
}

export default new BranchSettingsController();
