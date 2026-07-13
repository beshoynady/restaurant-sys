import express from "express";
import attendanceRecordController from "./attendance-record.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createAttendanceRecordSchema, 
  updateAttendanceRecordSchema, 
  paramsAttendanceRecordSchema, 
  paramsAttendanceRecordIdsSchema,
  queryAttendanceRecordSchema 
} from "./attendance-record.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("AttendanceRecords", "create"),
    checkModuleEnabled("hr"), validate(createAttendanceRecordSchema), attendanceRecordController.create)
  .get(authenticateToken,
    authorize("AttendanceRecords", "read"),
    checkModuleEnabled("hr"), validate(queryAttendanceRecordSchema), attendanceRecordController.getAll)
;

// Monthly summary — Frontend Readiness / Payroll integration (module doc §9).
router.route("/summary/monthly").get(
  authenticateToken,
  authorize("AttendanceRecords", "read"),
  checkModuleEnabled("hr"),
  attendanceRecordController.monthlySummary,
);

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("AttendanceRecords", "read"),
    checkModuleEnabled("hr"), validate(paramsAttendanceRecordSchema), attendanceRecordController.getOne)
  .put(authenticateToken,
    authorize("AttendanceRecords", "update"),
    checkModuleEnabled("hr"), validate(updateAttendanceRecordSchema), attendanceRecordController.update)
  .delete(authenticateToken,
    authorize("AttendanceRecords", "delete"),
    checkModuleEnabled("hr"), validate(paramsAttendanceRecordSchema), attendanceRecordController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("AttendanceRecords", "delete"),
    checkModuleEnabled("hr"), validate(paramsAttendanceRecordSchema), attendanceRecordController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("AttendanceRecords", "update"),
    checkModuleEnabled("hr"), validate(paramsAttendanceRecordSchema), attendanceRecordController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("AttendanceRecords", "delete"),
    checkModuleEnabled("hr"), validate(paramsAttendanceRecordIdsSchema), attendanceRecordController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("AttendanceRecords", "delete"),
    checkModuleEnabled("hr"),validate(paramsAttendanceRecordIdsSchema), attendanceRecordController.bulkSoftDelete);


export default router;
