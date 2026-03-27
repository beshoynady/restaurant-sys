import AttendanceRecordModel from "../../models/employees/attendance-record.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for attendance-record model
const attendanceRecordService = new AdvancedCrudService(AttendanceRecordModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","employee","shift","leaveRequest","createdBy","updatedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default attendanceRecordService;
