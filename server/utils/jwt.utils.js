import jwt from "jsonwebtoken";

/**
 * ==========================================
 * 🔐 JWT UTILITY SERVICE
 * ==========================================
 */

const ACCESS_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES || "15m";

const REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES || "7d";

/**
 * ==========================================
 * 🔑 Generate Access Token
 * ==========================================
 */
export const signAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      brand: user.brand?.toString(),
      role: user.role?.toString(),
      branch: user.branch?.toString(),
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRE },
  );
};

/**
 * ==========================================
 * 🔄 Generate Refresh Token
 * ==========================================
 */
export const signRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      brand: user.brand?.toString(),
    },
    process.env.JWT_SECRET,
    { expiresIn: REFRESH_EXPIRE },
  );
};

/**
 * ==========================================
 * ✅ Verify Access Token
 * ==========================================
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
};

/**
 * ==========================================
 * ✅ Verify Refresh Token
 * ==========================================
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
};
