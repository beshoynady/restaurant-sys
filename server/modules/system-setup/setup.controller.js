import asyncHandler from "../../utils/asyncHandler.js";
import setupService from "./setup.service.js";

class SetupController {
  /**
   * ==========================================
   * 🚀 INITIAL SYSTEM SETUP
   * ==========================================
   */
  initialize = asyncHandler(async (req, res) => {
    // =============================
    // 🚀 CALL SETUP SERVICE
    // =============================
    const { brand, branch, user, tokens } =
      await setupService.initialize(req.body);

    // =============================
    // 🍪 SET REFRESH TOKEN (HTTP ONLY COOKIE)
    // =============================
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true, // 🔐 not accessible via JS (XSS protection)
      secure: process.env.NODE_ENV === "production", // HTTPS only in prod
      sameSite: "strict", // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // =============================
    // 📦 RESPONSE (ACCESS TOKEN ONLY)
    // =============================
    res.status(201).json({
      success: true,
      message: "System initialized successfully",
      user,
      brand,
      branch,
      accessToken: tokens.accessToken,
    });
  });
}

export default new SetupController();