import asyncHandler from "../../utils/asyncHandler.js";
import setupService from "./setup.service.js";

/**
 * 🚀 System Setup Controller
 * -------------------------
 * Handles first-time system initialization:
 * Brand + Branch + Owner Role + Owner User
 */
export const initializeSystem = asyncHandler(async (req, res) => {
  // =============================
  // 1. CALL SERVICE
  // =============================
  const result = await setupService.initialize(req.body);

  const { user, accessToken, refreshToken } = result;

  // =============================
  // 2. SET AUTH COOKIES
  // =============================
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 min
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // =============================
  // 3. RESPONSE
  // =============================
  return res.status(201).json({
    success: true,
    message: "System initialized successfully",
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        brand: user.brand,
        branch: user.branch,
      },
    },
  });
});