import express from "express";
import attendanceRecordController from "../../controllers/employees/attendance-record.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createattendanceRecordSchema, updateattendanceRecordSchema } from "../../validation/employees/attendance-record.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createattendanceRecordSchema), attendanceRecordController.create)
  .get(authenticateToken, attendanceRecordController.getAll)
;

router.route("/:id")
  .get(authenticateToken, attendanceRecordController.getOne)
  .put(authenticateToken, validate(updateattendanceRecordSchema), attendanceRecordController.update)
  .delete(authenticateToken, attendanceRecordController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, attendanceRecordController.restore)
;



export default router;
