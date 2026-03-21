import EmployeeModel from "../../models/employees/employee.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Joi from "joi";
import dotenv from "dotenv";
dotenv.config();
import asyncHandler from "../../utils/asyncHandler.js";

/* ===========================================================
 * Helper Joi Schema for Multilingual Map Fields
 * =========================================================== */
const mapLangSchema = Joi.object().pattern(
  Joi.string().min(2),
  Joi.string().min(1).max(100),
);

/* ===========================================================
 * 1. Joi Schemas
 * =========================================================== */

// Schema for creating first employee (system owner)
const createFirstEmployeeSchema = Joi.object({
  personalInfo: Joi.object({
    fullName: mapLangSchema.required(),
    gender: Joi.string().valid("male", "female", "other").required(),
    dateOfBirth: Joi.date().optional(),
    nationalID: Joi.string().min(10).max(30).required(),
    nationality: Joi.string().optional(),
  }).required(),
  contactInfo: Joi.object({
    phone: Joi.string().required(),
    email: Joi.string().email().optional(),
  }).required(),
  credentials: Joi.object({
    username: Joi.string().min(3).max(100).required(),
    password: Joi.string().min(6).max(200).required(),
  }).required(),
});

// Schema for creating regular employee
const createEmployeeSchema = Joi.object({
  brand: Joi.string().required(),
  branch: Joi.string().required(),
  department: Joi.string().required(),
  jobTitle: Joi.string().required(),

  personalInfo: Joi.object({
    fullName: mapLangSchema.required(),
    gender: Joi.string().valid("male", "female", "other").required(),
    dateOfBirth: Joi.date().required(),
    nationalID: Joi.string().min(10).max(30).required(),
  }).required(),

  contactInfo: Joi.object({
    phone: Joi.string().required(),
    email: Joi.string().email().optional(),
  }).required(),

  employmentInfo: Joi.object({
    employeeCode: Joi.string().required(),
    hireDate: Joi.date().required(),
    contractType: Joi.string()
      .valid("permanent", "temporary", "part-time", "internship")
      .required(),
    dailyWorkingHours: Joi.number().min(1).max(24).optional(),
    weeklyOffDay: Joi.string().optional(),
  }).required(),

  financialDetails: Joi.object({
    basicSalary: Joi.number().min(0).required(),
    salaryType: Joi.string()
      .valid("monthly", "weekly", "daily", "hourly")
      .default("monthly"),
    currency: Joi.string().default("EGP"),
    payDay: Joi.number().min(1).max(31).optional(),
  }).required(),

  credentials: Joi.object({
    username: Joi.string().min(3).max(100).required(),
    password: Joi.string().min(6).max(200).required(),
    isAdmin: Joi.boolean().default(false),
  }).required(),
});

// Schema for updating employee
const updateEmployeeSchema = Joi.object({
  brand: Joi.string().optional(),
  branch: Joi.string().optional(),
  department: Joi.string().optional(),
  jobTitle: Joi.string().optional(),
  personalInfo: Joi.object({
    fullName: mapLangSchema.optional(),
    gender: Joi.string().valid("male", "female", "other").optional(),
    dateOfBirth: Joi.date().optional(),
  }).optional(),
  contactInfo: Joi.object({
    phone: Joi.string().optional(),
    email: Joi.string().email().optional(),
  }).optional(),
  employmentInfo: Joi.object({
    employeeCode: Joi.string().optional(),
    hireDate: Joi.date().optional(),
    contractType: Joi.string()
      .valid("permanent", "temporary", "part-time", "internship")
      .optional(),
    dailyWorkingHours: Joi.number().min(1).max(24).optional(),
    weeklyOffDay: Joi.string().optional(),
  }).optional(),
  financialDetails: Joi.object({
    basicSalary: Joi.number().min(0).optional(),
    salaryType: Joi.string()
      .valid("monthly", "weekly", "daily", "hourly")
      .optional(),
    currency: Joi.string().optional(),
    payDay: Joi.number().min(1).max(31).optional(),
  }).optional(),
  credentials: Joi.object({
    username: Joi.string().min(3).max(100).optional(),
    password: Joi.string().min(6).max(200).optional(),
    isAdmin: Joi.boolean().optional(),
  }).optional(),
});

/* ===========================================================
 * 2. CREATE FIRST EMPLOYEE (SYSTEM OWNER)
 * =========================================================== */
const createFirstEmployee = asyncHandler(async (req, res) => {
  const { error } = createFirstEmployeeSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error)
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.details.map((e) => e.message),
    });

  const exists = await EmployeeModel.countDocuments();
  if (exists > 0)
    return res.status(400).json({
      success: false,
      message: "System already initialized",
    });

  const { credentials } = req.body;
  const hashedPassword = await bcrypt.hash(credentials.password, 10);

  const employee = await EmployeeModel.create({
    ...req.body,
    employmentInfo: {
      isOwner: true,
      isVerified: true,
      isActive: true,
    },
    credentials: {
      ...credentials,
      password: hashedPassword,
    },
  });

  const accessToken = jwt.sign(
    {
      id: employee._id,
      isAdmin: employee.type === "system_user",
      status: employee.employmentInfo.status,
      isVerified: employee.employmentInfo.isVerified,
      isOwner: employee.employmentInfo.isOwner,
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "15m" },
  );

  return res.status(201).json({
    success: true,
    message: "First employee created successfully",
    data: employee,
    accessToken,
  });
});

/* ===========================================================
 * 3. CREATE REGULAR EMPLOYEE
 * =========================================================== */
const createEmployee = asyncHandler(async (req, res) => {
  const { error } = createEmployeeSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error)
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.details.map((e) => e.message),
    });

  const { credentials, contactInfo, personalInfo } = req.body;

  // Check duplicates (username, phone, nationalID)
  const duplicate = await EmployeeModel.findOne({
    $or: [
      { "credentials.username": credentials.username },
      { "contactInfo.phone": contactInfo.phone },
      { "personalInfo.nationalID": personalInfo.nationalID },
    ],
  });

  if (duplicate)
    return res.status(409).json({
      success: false,
      message: "Employee already exists",
    });

  const hashedPassword = await bcrypt.hash(credentials.password, 10);

  const employee = await EmployeeModel.create({
    ...req.body,
    credentials: {
      ...credentials,
      password: hashedPassword,
    },
    createdBy: req.user?._id || null,
  });

  return res.status(201).json({
    success: true,
    message: "Employee created successfully",
    data: employee,
  });
});

/* ===========================================================
 * 4. UPDATE EMPLOYEE
 * =========================================================== */
const updateEmployee = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;

  if (req.body.credentials?.password) {
    req.body.credentials.password = await bcrypt.hash(
      req.body.credentials.password,
      10,
    );
  }

  const { error } = updateEmployeeSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error)
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.details.map((e) => e.message),
    });

  const employee = await EmployeeModel.findOneAndUpdate(
    { _id: employeeId, isDeleted: false },
    { ...req.body, updatedBy: req.user?._id || null },
    { new: true },
  );

  if (!employee)
    return res.status(404).json({
      success: false,
      message: "Employee not found",
    });

  return res.status(200).json({
    success: true,
    message: "Employee updated successfully",
    data: employee,
  });
});

/* ===========================================================
 * 5. LOGIN EMPLOYEE
 * =========================================================== */
const loginEmployee = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const employee = await EmployeeModel.findOne({
    "credentials.username": username,
    isDeleted: false,
  }).select("+credentials.password");

  if (!employee)
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });

  const match = await bcrypt.compare(password, employee.credentials.password);
  if (!match)
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });

  const accessToken = jwt.sign(
    {
      id: employee._id,
      isAdmin: employee.type === "system_user",
      isOwner: employee.employmentInfo?.isOwner || false,
      isVerified: employee.employmentInfo?.isVerified || false,
      isActive: employee.employmentInfo?.status === "active",
      brand: employee.brand.toString(),
      branch: employee.branch ? employee.branch.toString() : null,
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "15m" },
  );

  return res.status(200).json({
    success: true,
    message: "Login successful",
    accessToken,
    employee,
  });
});

/* ===========================================================
 * 5. LOGOUT EMPLOYEE
 * =========================================================== */
const logoutEmployee = asyncHandler(async (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  res
    .status(200)
    .json({ status: "success", message: "✅ Logged out successfully." });
});

/* ===========================================================
 * 6. GET SINGLE EMPLOYEE
 * =========================================================== */

const getOneEmployee = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const employee = await EmployeeModel.findOne({
    _id: employeeId,
  }).populate("branch department jobTitle");
  if (!employee)
    return res.status(404).json({ success: false, message: "Not found" });
  return res.status(200).json({ success: true, data: employee });
});
/* ===========================================================
 * 6. GET EMPLOYEES (PAGINATION)
 * =========================================================== */
const getEmployeesWithPagination = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const data = await EmployeeModel.find({ isDeleted: false })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate("branch department jobTitle");

  const total = await EmployeeModel.countDocuments({ isDeleted: false });

  return res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data,
  });
});

const getEmployeesByBranch = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const employees = await EmployeeModel.find({
    branch: branchId,
    isDeleted: false,
  })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate("department jobTitle");

  return res.status(200).json({
    success: true,
    data: employees,
  });
});

/* ===========================================================
 * 7. SOFT DELETE / RESTORE EMPLOYEE
 * =========================================================== */
const softDeleteEmployee = asyncHandler(async (req, res) => {
  const employee = await EmployeeModel.findById(req.params.employeeId);
  if (!employee)
    return res.status(404).json({ success: false, message: "Not found" });

  employee.isDeleted = true;
  employee.deletedAt = new Date();
  employee.deletedBy = req.user?._id || null;
  employee.employmentInfo.status = "archived";

  await employee.save();

  return res.status(200).json({
    success: true,
    message: "Employee deleted successfully",
  });
});

const restoreEmployee = asyncHandler(async (req, res) => {
  const employee = await EmployeeModel.findById(req.params.employeeId);
  if (!employee || !employee.isDeleted)
    return res.status(404).json({ success: false, message: "Not found" });

  employee.isDeleted = false;
  employee.deletedAt = null;
  employee.deletedBy = null;
  employee.employmentInfo.status = "active";

  await employee.save();

  return res.status(200).json({
    success: true,
    message: "Employee restored successfully",
    data: employee,
  });
});

/* ===========================================================
 * export  CONTROLLER
 * =========================================================== */
export {
  createFirstEmployee,
  createEmployee,
  updateEmployee,
  loginEmployee,
  logoutEmployee,
  getOneEmployee,
  getEmployeesWithPagination,
  getEmployeesByBranch,
  softDeleteEmployee,
  restoreEmployee,
};
