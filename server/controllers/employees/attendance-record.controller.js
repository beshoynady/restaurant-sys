import BaseController from "../BaseController.js";
import attendanceRecordService from "../../services/employees/attendance-record.service.js";

class AttendanceRecordController extends BaseController {
  constructor() {
    super(attendanceRecordService);
  }
}

export default new AttendanceRecordController();
