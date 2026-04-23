import express from "express";
import attendanceRecordController from "./attendance-record.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
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
  .post(authenticateToken, validate(createAttendanceRecordSchema), attendanceRecordController.create)
  .get(authenticateToken, validate(queryAttendanceRecordSchema), attendanceRecordController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsAttendanceRecordSchema), attendanceRecordController.getOne)
  .put(authenticateToken, validate(updateAttendanceRecordSchema), attendanceRecordController.update)
  .delete(authenticateToken, validate(paramsAttendanceRecordSchema), attendanceRecordController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsAttendanceRecordSchema), attendanceRecordController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsAttendanceRecordSchema), attendanceRecordController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsAttendanceRecordIdsSchema), attendanceRecordController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsAttendanceRecordIdsSchema), attendanceRecordController.bulkSoftDelete);


export default router;
