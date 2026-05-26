import jwt from "jsonwebtoken";

/**
 * ==========================================
 * 🔐 JWT UTILITY SERVICE
 * Handles Access & Refresh Token logic
 * ==========================================
 */

// =========================
// CONFIG
// =========================
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

/**
 * ==========================================
 * 🔑 Generate Access Token
 * Short-lived token for API authentication
 * ==========================================
 */
export const signAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      brand: user.brand,
      role: user.role,
      branch: user.branch,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: ACCESS_EXPIRES_IN,
    }
  );
};

/**
 * ==========================================
 * 🔄 Generate Refresh Token
 * Long-lived token for renewing access token
 * ==========================================
 */
export const signRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      brand: user.brand,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: REFRESH_EXPIRES_IN,
    }
  );
};

/**
 * ==========================================
 * ✅ Verify Access Token
 * ==========================================
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * ==========================================
 * ✅ Verify Refresh Token
 * ==========================================
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};