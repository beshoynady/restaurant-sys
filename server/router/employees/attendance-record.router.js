const express = require("express");
const router = express.Router();
const {
  createAttendanceRecord,
  getAllAttendanceRecords,
  getAttendanceRecordById,
  updateAttendanceRecordById,
  deleteAttendanceRecordById,
} = require("../../controllers/employees/attendance-record.controller.js");

const { authenticateToken } = require("../../middlewares/authenticate");


router
  .route("/")
  .post(authenticateToken,createAttendanceRecord)
  .get(authenticateToken,getAllAttendanceRecords);

router
  .route("/:id")
  .get(authenticateToken,getAttendanceRecordById)
  .put(authenticateToken,updateAttendanceRecordById)
  .delete(authenticateToken,deleteAttendanceRecordById);

module.exports = router;
