// TODO: Implement controller for attendance-record.controller
const AttendanceRecordModel = require("../../models/employees/attendance-record.model");

// Create a new attendance record
const createAttendanceRecord = async (req, res) => {
  try {
    const {
      employee,
      shift,
      currentDate,
      status,
      notes,
      arrivalDate,
      lateMinutes,
      isLate,
    } = req.body;
    const createdBy = req.user.id;

    if (!employee || !shift || !currentDate || !status) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const attendanceData = {
      employee,
      shift,
      currentDate,
      status,
      notes,
      createdBy,
    };

    if (status === "Attendance") {
      if (!arrivalDate) {
        return res
          .status(400)
          .json({ message: "Missing arrivalDate for Attendance status" });
      }
      attendanceData.arrivalDate = arrivalDate;
      attendanceData.lateMinutes = lateMinutes;
      attendanceData.isLate = isLate;
    }

    const attendanceRecord = await AttendanceRecordModel.create(attendanceData);

    res.status(201).json(attendanceRecord);
  } catch (error) {
    console.error("Error creating attendance record:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Validation Error", error });
    }

    res
      .status(500)
      .json({ message: "Failed to create attendance record", error });
  }
};

// Update a specific attendance record by its ID
const updateAttendanceRecordById = async (req, res) => {
  try {
    const attendanceRecordId = req.params.id;
    const {
      employee,
      shift,
      currentDate,
      arrivalDate,
      departureDate,
      status,
      isOvertime,
      overtimeMinutes,
      isLate,
      lateMinutes,
      notes,
    } = req.body;

    const updatedBy = req.user.id;

    const updatedAttendanceRecord =
      await AttendanceRecordModel.findByIdAndUpdate(
        attendanceRecordId,
        {
          employee,
          shift,
          currentDate,
          arrivalDate,
          departureDate,
          status,
          isOvertime,
          overtimeMinutes,
          isLate,
          lateMinutes,
          notes,
          updatedBy,
        },
        { new: true }
      );

    if (!updatedAttendanceRecord) {
      return res.status(404).json({ message: "Attendance record not found" });
    }
    res.status(200).json({
      message: "Attendance record updated successfully",
      updatedAttendanceRecord,
    });
  } catch (error) {
    console.error("Error updating attendance record:", error);
    res
      .status(400)
      .json({ message: "Failed to update attendance record", error });
  }
};

// Retrieve all attendance records
const getAllAttendanceRecords = async (req, res) => {
  try {
    const attendanceRecords = await AttendanceRecordModel.find()
      .populate("employee")
      .populate("shift")
      .populate("createdBy")
      .populate("updatedBy");
    res.status(200).json(attendanceRecords);
  } catch (error) {
    console.error("Error getting all attendance records:", error);
    res
      .status(500)
      .json({ message: "Failed to get attendance records", error });
  }
};

// Retrieve a specific attendance record by its ID
const getAttendanceRecordById = async (req, res) => {
  try {
    const attendanceRecordId = req.params.id;
    const attendanceRecord = await AttendanceRecordModel.findById(
      attendanceRecordId
    )
      .populate("employee")
      .populate("shift")
      .populate("createdBy")
      .populate("updatedBy");
    if (!attendanceRecord) {
      return res.status(404).json({ message: "Attendance record not found" });
    }
    res.status(200).json(attendanceRecord);
  } catch (error) {
    console.error("Error getting attendance record by ID:", error);
    res.status(500).json({ message: "Failed to get attendance record", error });
  }
};

// Delete a specific attendance record by its ID
const deleteAttendanceRecordById = async (req, res) => {
  try {
    const attendanceRecordId = req.params.id;
    const deletedAttendanceRecord =
      await AttendanceRecordModel.findByIdAndDelete(attendanceRecordId);
    if (!deletedAttendanceRecord) {
      return res.status(404).json({ message: "Attendance record not found" });
    }
    res.status(200).json({ message: "Attendance record deleted successfully" });
  } catch (error) {
    console.error("Error deleting attendance record:", error);
    res
      .status(400)
      .json({ message: "Failed to delete attendance record", error });
  }
};

module.exports = {
  createAttendanceRecord,
  getAllAttendanceRecords,
  getAttendanceRecordById,
  updateAttendanceRecordById,
  deleteAttendanceRecordById,
};
