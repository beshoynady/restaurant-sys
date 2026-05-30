import jwt from "jsonwebtoken";

/**
 * ==========================================
 * 🔐 JWT CONFIG
 * ==========================================
 */

const ACCESS_EXPIRE = process.env.ACCESS_TOKEN_EXPIRES || "15m";
const REFRESH_EXPIRE = process.env.REFRESH_TOKEN_EXPIRES || "7d";

/**
 * ==========================================
 * 🔑 ACCESS TOKEN
 * ==========================================
 */
export const signAccessToken = (user) => {
  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET is missing in env");
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      brand: user.brand?.toString(),
      role: user.role?.toString(),
      branch: user.branch?.toString(),
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: ACCESS_EXPIRE,
    },
  );
};

/**
 * ==========================================
 * 🔄 REFRESH TOKEN
 * ==========================================
 */
export const signRefreshToken = (user) => {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("REFRESH_TOKEN_SECRET is missing in env");
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      brand: user.brand?.toString(),
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: REFRESH_EXPIRE,
    },
  );
};
