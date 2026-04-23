import BaseController from "../../utils/BaseController.js";
import leaveRequestService from "./leave-request.service.js";

class LeaveRequestController extends BaseController {
  constructor() {
    super(leaveRequestService);
  }
}

export default new LeaveRequestController();
