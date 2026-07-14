import asyncHandler from "../../../utils/asyncHandler.js";
import authService from "./user-auth.service.js";

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function requestMeta(req) {
  return {
    deviceLabel: req.body?.deviceLabel || null,
    ipAddress: req.ip || null,
    userAgent: req.headers["user-agent"] || null,
  };
}

class AuthController {
  // =========================
  // 🔐 LOGIN (password) + SET COOKIES
  // =========================
  login = asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.login({
      ...req.body,
      ...requestMeta(req),
    });

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTS);

    res.status(200).json({
      user,
      accessToken,
      message: "Login successful",
    });
  });

  // =========================
  // 🔐 LOGIN (PIN / BARCODE / QR) — Owner Controlled Authentication fast-login
  // =========================
  loginWithCredential = asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.loginWithCredential({
      ...req.body,
      ...requestMeta(req),
    });

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTS);

    res.status(200).json({
      user,
      accessToken,
      message: "Login successful",
    });
  });

  // =========================
  // 🔄 REFRESH TOKEN
  // -------------------------
  // IAM Platform Redesign: refresh tokens now rotate on every use (user-auth.service.js#refresh)
  // — the response MUST set the new refreshToken cookie, not just the new access token, or the
  // client's next refresh attempt would present the now-revoked old token and fail.
  // =========================
  refresh = asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken || req.body.refreshToken;

    const result = await authService.refresh(token, requestMeta(req));

    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", result.refreshToken, REFRESH_COOKIE_OPTS);

    res.json({
      accessToken: result.accessToken,
      message: "Token refreshed",
    });
  });

  // =========================
  // 🚪 LOGOUT
  // -------------------------
  // IAM Platform Redesign: previously only cleared cookies client-side — the refresh token itself
  // remained valid server-side until natural expiry (up to 7 days), so a stolen cookie captured
  // before logout would keep working. Now actually revokes the Session.
  // =========================
  logout = asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    await authService.logout(token);

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.json({
      message: "Logged out successfully",
    });
  });

  // =========================
  // 🚪 LOGOUT EVERYWHERE
  // =========================
  logoutAllSessions = asyncHandler(async (req, res) => {
    await authService.logoutAllSessions(req.user.userId);

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.json({
      message: "Logged out of all sessions",
    });
  });
}

export default new AuthController();
