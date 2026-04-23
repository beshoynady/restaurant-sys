import BaseController from "../../utils/BaseController.js";
import jobTitleService from "./job-title.service.js";

class JobTitleController extends BaseController {
  constructor() {
    super(jobTitleService);
  }
}

export default new JobTitleController();
