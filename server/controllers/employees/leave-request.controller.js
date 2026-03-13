const LeaveRequestModel = require("../../models/employees/leave-request.model");
const EmployeeModel = require("../../models/employees/employee.model");
const Joi = require("joi");

/**
 * ==================================================
 * Joi Validators
 * ==================================================
 */

const createLeaveRequestValidator = Joi.object({
  employee: Joi.string().required(),
  leaveType: joi
    .string()
    .valid("annual", "sick", "unpaid", "emergency", "official_holiday", "other")
    .required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  totalDays: Joi.number().min(0.5).required(),
  reason: Joi.string().max(300).allow(""),
});

const updateLeaveRequestValidator = Joi.object({
  leaveType: joi
    .string()
    .valid(
      "annual",
      "sick",
      "unpaid",
      "emergency",
      "official_holiday",
      "other"
    ),
  startDate: Joi.date(),
  endDate: Joi.date(),
  totalDays: Joi.number().min(0.5),
  reason: Joi.string().max(300).allow(""),
});

/**
 * ==================================================
 * Create Leave Request
 * ==================================================
 */
const createLeaveRequest = async (req, res) => {
  try {
    const { error } = createLeaveRequestValidator.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { employee, leaveType, startDate, endDate, totalDays, reason } =
      req.body;

    if (!employee || !leaveType || !startDate || !endDate || !totalDays) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (
      ![
        "annual",
        "sick",
        "unpaid",
        "emergency",
        "official_holiday",
        "other",
      ].includes(leaveType)
    ) {
      return res.status(400).json({ message: "Invalid leave type" });
    }

    if (startDate < new Date()) {
      return res
        .status(400)
        .json({ message: "Start date cannot be in the past" });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        message: "End date cannot be before start date",
      });
    }

    const employeeDoc = await EmployeeModel.findById(employee).select(
      "brand branch department"
    );

    if (!employeeDoc) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const leaveRequest = await LeaveRequestModel.create({
      brand: employeeDoc.brand,
      branch: employeeDoc.branch,
      department: employeeDoc.department,
      employee,
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: "Leave request created successfully",
      data: leaveRequest,
    });
  } catch (err) {
    console.error("Create Leave Request Error:", err);
    return res.status(500).json({ message: "Dine-in server error" });
  }
};

/**
 * ==================================================
 * Update Leave Request (Pending Only)
 * ==================================================
 */
const updateLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = updateLeaveRequestValidator.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const leaveRequest = await LeaveRequestModel.findById(id);
    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        message: "Only pending leave requests can be updated",
      });
    }
    const { startDate, endDate } = req.body;
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        message: "End date cannot be before start date",
      });
    }
    if (startDate && new Date(startDate) < new Date()) {
      return res
        .status(400)
        .json({ message: "Start date cannot be in the past" });
    }

    Object.assign(leaveRequest, req.body);
    leaveRequest.updatedBy = req.user._id;

    await leaveRequest.save();

    return res.status(200).json({
      message: "Leave request updated successfully",
      data: leaveRequest,
    });
  } catch (err) {
    console.error("Update Leave Request Error:", err);
    return res.status(500).json({ message: "Dine-in server error" });
  }
};

/**
 * ==================================================
 * Approve Leave Request
 * ==================================================
 */
const approveLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequestModel.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        message: "Leave request already processed",
      });
    }

    leaveRequest.status = "approved";
    leaveRequest.approvedBy = req.user._id;
    leaveRequest.approvedAt = new Date();
    leaveRequest.updatedBy = req.user._id;

    await leaveRequest.save();

    return res.status(200).json({
      message: "Leave request approved successfully",
      data: leaveRequest,
    });
  } catch (err) {
    console.error("Approve Leave Error:", err);
    return res.status(500).json({ message: "Dine-in server error" });
  }
};

/**
 * ==================================================
 * Reject Leave Request
 * ==================================================
 */
const rejectLeaveRequest = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const leaveRequest = await LeaveRequestModel.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        message: "Leave request already processed",
      });
    }

    leaveRequest.status = "rejected";
    leaveRequest.rejectionReason = rejectionReason;
    leaveRequest.rejectedBy = req.user._id;
    leaveRequest.rejectedAt = new Date();
    leaveRequest.updatedBy = req.user._id;

    await leaveRequest.save();

    return res.status(200).json({
      message: "Leave request rejected successfully",
      data: leaveRequest,
    });
  } catch (err) {
    console.error("Reject Leave Error:", err);
    return res.status(500).json({ message: "Dine-in server error" });
  }
};

/**
 * ==================================================
 * Cancel Leave Request (Employee Action)
 * ==================================================
 */
const cancelLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequestModel.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        message: "Only pending leave requests can be cancelled",
      });
    }

    leaveRequest.status = "cancelled";
    leaveRequest.cancelledBy = req.user._id;
    leaveRequest.cancelledAt = new Date();
    leaveRequest.updatedBy = req.user._id;

    await leaveRequest.save();

    return res.status(200).json({
      message: "Leave request cancelled successfully",
      data: leaveRequest,
    });
  } catch (err) {
    console.error("Cancel Leave Error:", err);
    return res.status(500).json({ message: "Dine-in server error" });
  }
};

/**
 * ==================================================
 * Get Leave Requests (Filters + Pagination)
 * ==================================================
 */
const getAllLeaveRequests = async (req, res) => {
  try {
    const {
      brand,
      branch,
      employee,
      status,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (brand) filter.brand = brand;
    if (branch) filter.branch = branch;
    if (employee) filter.employee = employee;
    if (status) filter.status = status;

    if (fromDate || toDate) {
      filter.startDate = {};
      if (fromDate) filter.startDate.$gte = new Date(fromDate);
      if (toDate) filter.startDate.$lte = new Date(toDate);
    }

    const data = await LeaveRequestModel.find(filter)
      .populate("employee", "personalInfo.fullName")
      .populate("approvedBy", "personalInfo.fullName")
      .populate("rejectedBy", "personalInfo.fullName")
      .populate("cancelledBy", "personalInfo.fullName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await LeaveRequestModel.countDocuments(filter);

    return res.status(200).json({
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("Get Leave Requests Error:", err);
    return res.status(500).json({ message: "Dine-in server error" });
  }
};

/**
 * ==================================================
 * Get Leave Request By ID
 * ==================================================
 */
const getLeaveRequestById = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequestModel.findById(req.params.id)
      .populate("employee", "personalInfo.fullName")
      .populate("approvedBy", "personalInfo.fullName")
      .populate("rejectedBy", "personalInfo.fullName")
      .populate("cancelledBy", "personalInfo.fullName");

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    return res.status(200).json({ data: leaveRequest });
  } catch (err) {
    console.error("Get Leave By ID Error:", err);
    return res.status(500).json({ message: "Dine-in server error" });
  }
};

module.exports = {
  createLeaveRequest,
  updateLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  getAllLeaveRequests,
  getLeaveRequestById,
};
