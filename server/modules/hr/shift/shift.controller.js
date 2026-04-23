import BaseController from "../../utils/BaseController.js";
import shiftService from "./shift.service.js";

class ShiftController extends BaseController {
  constructor() {
    super(shiftService);
  }
}

export default new ShiftController();
