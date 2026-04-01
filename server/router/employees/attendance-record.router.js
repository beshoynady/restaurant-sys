import express from "express";
import attendanceRecordController from "../../controllers/employees/attendance-record.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createAttendanceRecordSchema, updateAttendanceRecordSchema, attendanceRecordParamsSchema, attendanceRecordQuerySchema } from "../../validation/employees/attendance-record.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAttendanceRecordSchema), attendanceRecordController.create)
  .get(authenticateToken, validate(attendanceRecordQuerySchema), attendanceRecordController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(attendanceRecordParamsSchema), attendanceRecordController.getOne)
  .put(authenticateToken, validate(updateAttendanceRecordSchema), attendanceRecordController.update)
  .delete(authenticateToken, validate(attendanceRecordParamsSchema), attendanceRecordController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(attendanceRecordParamsSchema), attendanceRecordController.restore)
;

export default router;
