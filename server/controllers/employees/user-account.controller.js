import userAccountModel from "../../models/employees/user-account.model.js";
import asyncHandler from "../../utils/asyncHandler.js";
import throwError from "../../utils/throwError.js";
import bcrypt from "bcrypt";
import joi from "joi";

const secretKey = process.env.JWT_SECRET_KEY;

// ----------------------------
// Validation Schemas
// ----------------------------
const createUserSchema = joi.object({
  brand: joi.string().required(),
  branch: joi.string().required(),
  username: joi.string().min(3).max(30).required(),
  email: joi.string().email().optional().allow(null, ""),
  phone: joi.string().optional().allow(null, ""),
  password: joi.string().min(6).required(),
  employee: joi.string().optional().allow(null, ""),
  role: joi.string().optional().allow(null, ""),
  brand: joi.string().optional().allow(null, ""),
  branch: joi.string().optional().allow(null, ""),
});

const updateUserSchema = joi.object({
  username: joi.string().min(3).max(30).optional(),
  email: joi.string().email().optional(),
  phone: joi.string().optional(),
  role: joi.string().optional().allow(null, ""),
  isActive: joi.boolean().optional(),
  employee: joi.string().optional().allow(null, ""),
});

// ----------------------------
// Controller Functions
// ----------------------------

// Get single user account by ID
const getUserAccountById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userAccount = await userAccountModel
    .findById(id)
    .populate("employee", "name")
    .populate("role", "name permissions");
  if (!userAccount) throwError("User account not found", 404);

  res.status(200).json({
    success: true,
    message: "User account retrieved successfully",
    userAccount,
  });
});

// Get all user accounts
const getAllUserAccounts = asyncHandler(async (req, res) => {
  const brand = req.brand._id;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  const userAccounts = await userAccountModel
    .find({ brand })
    .skip(skip)
    .limit(limit) // basic pagination, can be enhanced
    .populate("employee", "name")
    .populate("role", "name permissions");
  res.status(200).json({
    success: true,
    message: "All user accounts retrieved",
    userAccounts,
  });
});

const getUserAccountsByBranch = asyncHandler(async (req, res) => {
  const brand = req.brand._id;
  const branch = req.params.branchId;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  const userAccounts = await userAccountModel
    .find({ brand, branch })
    .skip(skip)
    .limit(limit)
    .populate("employee", "name")
    .populate("role", "name permissions");
  res.status(200).json({
    success: true,
    message: "User accounts for branch retrieved",
    userAccounts,
  });
});

const filterUserAccounts = asyncHandler(async (req, res) => {
  const brand = req.brand._id;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  const { branch, role, isActive } = req.query;
  const filter = { brand };
  if (branch) filter.branch = branch;
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === "true";

  const userAccounts = await userAccountModel
    .find(filter)
    .skip(skip)
    .limit(limit)
    .populate("employee", "name")
    .populate("role", "name permissions");

  res.status(200).json({
    success: true,
    message: "Filtered user accounts retrieved",
    userAccounts,
  });
});

// Create new user account
const createUserAccount = asyncHandler(async (req, res) => {
  const { brand } = req.brand._id;
  const { branch } = req.branch._id;
  const { error, value } = createUserSchema.validate({
    ...req.body,
    brand,
    branch,
  });
  if (error) return res.status(400).json({ success: false, error: error.details });
const existingUser = await userAccountModel.findOne({
    brand,
    username: value.username,
  });
    if (existingUser) {
        return res.status(409).json({ success: false, error: "Username already exists for this brand" });
    }
  // Hash password
  const passwordHash = await bcrypt.hash(value.password, secretKey, 10);
  value.password = passwordHash;

  const newUser = await userAccountModel.create(value);
  res.status(201).json({
    success: true,
    message: "User account created successfully",
    newUser,
  });
});

// Update user account
const updateUserAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error, value } = updateUserSchema.validate(req.body);
  if (error) throwError("Validation error", 400, error.details);

  const userAccount = await userAccountModel
    .findByIdAndUpdate(id, value, {
      new: true,
    })
    .populate("employee", "name")
    .populate("role", "name permissions");

  if (!userAccount) throwError("User account not found", 404);

  res.status(200).json({
    success: true,
    message: "User account updated successfully",
    userAccount,
  });
});

// Soft delete user account
const deleteUserAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userAccount = await userAccountModel.findById(id);
  if (!userAccount) throwError("User account not found", 404);

  userAccount.isDeleted = true;
  userAccount.deletedAt = new Date();
  userAccount.deletedBy = req.user?.id || null; // assuming auth middleware
  await userAccount.save();

  res.status(200).json({
    success: true,
    message: "User account deleted successfully",
  });
});

// Restore soft-deleted account
const restoreUserAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userAccount = await userAccountModel.findById(id);
  if (!userAccount) throwError("User account not found", 404);

  userAccount.isDeleted = false;
  userAccount.deletedAt = null;
  userAccount.deletedBy = null;
  await userAccount.save();

  res.status(200).json({
    success: true,
    message: "User account restored successfully",
    userAccount,
  });
});

// Toggle account active status
const toggleActiveStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userAccount = await userAccountModel.findById(id);
  if (!userAccount) throwError("User account not found", 404);

  userAccount.isActive = !userAccount.isActive;
  await userAccount.save();

  res.status(200).json({
    success: true,
    message: `User account is now ${userAccount.isActive ? "active" : "inactive"}`,
    userAccount,
  });
});

// Reset password
const resetPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword) throwError("New password is required", 400);

  const userAccount = await userAccountModel.findById(id);
  if (!userAccount) throwError("User account not found", 404);

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  userAccount.password = hashedPassword;
  await userAccount.save();

  res.status(200).json({
    success: true,
    message: "Password reset successfully",
  });
});

// Assign role to user
const assignRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { roleId } = req.body;
  if (!roleId) throwError("Role ID is required", 400);

  const userAccount = await userAccountModel.findById(id);
  if (!userAccount) throwError("User account not found", 404);

  userAccount.role = roleId;
  await userAccount.save();

  res.status(200).json({
    success: true,
    message: "Role assigned successfully",
    userAccount,
  });
});

// Link employee
const linkEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { employeeId } = req.body;
  if (!employeeId) throwError("Employee ID is required", 400);

  const userAccount = await userAccountModel.findById(id);
  if (!userAccount) throwError("User account not found", 404);

  userAccount.employee = employeeId;
  await userAccount.save();

  res.status(200).json({
    success: true,
    message: "Employee linked successfully",
    userAccount,
  });
});

// Unlink employee
const unlinkEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userAccount = await userAccountModel.findById(id);
  if (!userAccount) throwError("User account not found", 404);

  userAccount.employee = null;
  await userAccount.save();

  res.status(200).json({
    success: true,
    message: "Employee unlinked successfully",
    userAccount,
  });
});

// ----------------------------
// Export all functions
// ----------------------------
export {
  getUserAccountById,
  getAllUserAccounts,
  createUserAccount,
  updateUserAccount,
  deleteUserAccount,
  restoreUserAccount,
  toggleActiveStatus,
  resetPassword,
  assignRole,
  linkEmployee,
  unlinkEmployee,
};
