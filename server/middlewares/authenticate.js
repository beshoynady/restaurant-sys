const EmployeeModel = require("../models/employees/employee.model");
const BrandModel = require("../models/core/brand.model");
const BranchModel = require("../models/core/branch.model.js");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const secretKey = process.env.JWT_SECRET_KEY;
const refreshSecretKey = process.env.JWT_REFRESH_SECRET;

/**
 * Middleware: Authenticate access token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Token not provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: Token missing" });
    }

    // Verify token
    let payload;
    try {
      payload = jwt.verify(token, secretKey);
    } catch (err) {
      return res
        .status(403)
        .json({ message: "Forbidden: Invalid or expired token" });
    }

    // Validate payload
    if (
      !payload ||
      typeof payload.id !== "string" ||
      typeof payload.isAdmin !== "string" ||
      typeof payload.isOwner !== "boolean" ||
      typeof payload.isVerified !== "boolean" ||
      typeof payload.brand !== "string"
    ) {
      return res
        .status(403)
        .json({ message: "Forbidden: Invalid employee info in token" });
    }

    // Check permissions
    if (!payload.isAdmin || !payload.isVerified) {
      return res
        .status(403)
        .json({ message: "Forbidden: Employee not authorized" });
    }

    // Fetch employee from DB
    const employee = await EmployeeModel.findById(payload.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (employee.isDeleted || employee.employmentInfo.status !== "active") {
      return res
        .status(403)
        .json({ message: "Forbidden: Employee is inactive or deleted" });
    }

    const brandMatch = employee.brand.toString() === payload.brand;
    const branchMatch = employee.branch
      ? employee.branch.toString() === payload.branch
      : payload.branch === null;
    if (!brandMatch || !branchMatch) {
      return res
        .status(403)
        .json({ message: "Forbidden: Employee's brand/branch mismatch" });
    }

    const brand = await BrandModel.findById(employee.brand);
    if (!brand || brand.isDeleted) {
      return res
        .status(403)
        .json({ message: "Forbidden: Employee's brand is invalid" });
    }
    const branch = employee.branch
      ? await BranchModel.findById(employee.branch)
      : null;
    if (
      employee.branch &&
      (!branch ||
        branch.isDeleted ||
        branch.brand.toString() !== employee.brand.toString())
    ) {
      return res
        .status(403)
        .json({ message: "Forbidden: Employee's branch is invalid" });
    }

    req.employee = employee;
    req.brand = brand;
    req.branch = branch ? branch : null;
    next();
  } catch (err) {
    console.error("Authentication error:", err);
    return res
      .status(500)
      .json({ message: "Server error during authentication" });
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res
        .status(403)
        .json({ message: "Forbidden: Refresh token not provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, refreshSecretKey);
    } catch (err) {
      return res
        .status(403)
        .json({ message: "Forbidden: Invalid or expired refresh token" });
    }

    const employee = await EmployeeModel.findById(decoded.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        id: employee._id,
        isAdmin: employee.type === "system_user",
        isOwner: employee.employmentInfo?.isOwner || false,
        isVerified: employee.employmentInfo?.isVerified || false,
        brand: employee.brand.toString(),
        branch: employee.branch ? employee.branch.toString() : null,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "15m" },
    );

    res.status(200).json({ accessToken: accessToken });
  } catch (err) {
    console.error("Error refreshing access token:", err);
    res.status(500).json({ message: "Server error during token refresh" });
  }
};

module.exports = {
  authenticateToken,
  refreshAccessToken,
};
