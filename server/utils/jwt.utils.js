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
export const signAccessToken = (user, ttl = null) => {
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
      expiresIn: ttl || ACCESS_EXPIRE,
    },
  );
};

/**
 * ==========================================
 * 🔄 REFRESH TOKEN
 * ==========================================
 * IAM Platform Redesign (V4.0): `sessionId` is optional and backward-compatible (existing callers
 * that don't pass one, e.g. system-setup/setup.service.js's tenant-bootstrap login, are
 * unaffected) — when present, it's embedded as a claim so user-auth.service.js's session-based
 * refresh/logout/revocation flow (modules/iam/session/session.model.js) can look up the specific
 * Session a refresh token belongs to, instead of only being able to verify the JWT's signature
 * and expiry (which cannot express "this one device's session was revoked").
 */
export const signRefreshToken = (user, sessionId = null, ttl = null) => {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("REFRESH_TOKEN_SECRET is missing in env");
  }

  const payload = {
    id: user._id.toString(),
    brand: user.brand?.toString(),
  };
  if (sessionId) {
    payload.sid = sessionId.toString();
  }

  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: ttl || REFRESH_EXPIRE,
  });
};
