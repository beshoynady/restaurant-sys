import express from "express";
const router = express.Router();
import {
  createAttendanceRecord,
  getAllAttendanceRecords,
  getAttendanceRecordById,
  updateAttendanceRecordById,
  deleteAttendanceRecordById,
} from "../../controllers/employees/attendance-record.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";


router
  .route("/")
  .post(authenticateToken,createAttendanceRecord)
  .get(authenticateToken,getAllAttendanceRecords);

router
  .route("/:id")
  .get(authenticateToken,getAttendanceRecordById)
  .put(authenticateToken,updateAttendanceRecordById)
  .delete(authenticateToken,deleteAttendanceRecordById);

export default router;
