import asyncHandler from "../../../utils/asyncHandler.js";
import authService from "./user-auth.service.js";

class AuthController {
  // =========================
  // 🔐 LOGIN + SET COOKIES
  // =========================
  login = asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } =
      await authService.login(req.body);

    // 🍪 ACCESS TOKEN COOKIE
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 min
    });

    // 🍪 REFRESH TOKEN COOKIE
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      user,
      message: "Login successful",
    });
  });

  // =========================
  // 🔄 REFRESH TOKEN
  // =========================
  refresh = asyncHandler(async (req, res) => {
    const token =
      req.cookies.refreshToken || req.body.refreshToken;

    const result = await authService.refresh(token);

    // 🍪 update access token cookie
    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.json({
      message: "Token refreshed",
    });
  });

  // =========================
  // 🚪 LOGOUT
  // =========================
  logout = asyncHandler(async (req, res) => {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.json({
      message: "Logged out successfully",
    });
  });
}

export default new AuthController();