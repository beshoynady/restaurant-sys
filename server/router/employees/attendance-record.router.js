const express = require("express");
const router = express.Router();
const {
  createAttendanceRecord,
  getAllAttendanceRecords,
  getAttendanceRecordById,
  updateAttendanceRecordById,
  deleteAttendanceRecordById,
} = require("../../controllers/attendance.controller");

const { authenticateToken } = require("../../middlewares/authenticate");
const checkSubscription = require("../../middlewares/checkSubscription");

router
  .route("/")
  .post(authenticateToken, checkSubscription, createAttendanceRecord)
  .get(authenticateToken, checkSubscription, getAllAttendanceRecords);

router
  .route("/:id")
  .get(authenticateToken, checkSubscription, getAttendanceRecordById)
  .put(authenticateToken, checkSubscription, updateAttendanceRecordById)
  .delete(authenticateToken, checkSubscription, deleteAttendanceRecordById);

module.exports = router;
