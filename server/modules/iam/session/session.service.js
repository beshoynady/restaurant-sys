import crypto from "crypto";
import SessionModel from "./session.model.js";

/**
 * IAM Platform Redesign (V4.0) — Session management: create/rotate/revoke, replacing the single
 * `UserAccount.refreshToken` string field. Not a generic Repository-Pattern CRUD service on
 * purpose — sessions are never created/edited/deleted through generic REST verbs, only through
 * the specific lifecycle operations below (login creates one, refresh rotates one, logout revokes
 * one) — see AUTH_PLATFORM.md.
 */
class SessionService {
  hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Creates a new Session row for a just-issued refresh token. `_id` is accepted explicitly
   * (rather than left to Mongoose) because the refresh token itself embeds the session id as a
   * claim (jwt.utils.js's `sid`) — the caller must know the id before this row exists.
   */
  async create({ _id = null, brand, user, refreshToken, ttlMs, device = null, deviceLabel = null, ipAddress = null, userAgent = null, rotatedFrom = null }) {
    return SessionModel.create({
      ...(_id ? { _id } : {}),
      brand,
      user,
      refreshTokenHash: this.hashToken(refreshToken),
      rotatedFrom,
      device,
      deviceLabel,
      ipAddress,
      userAgent,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + ttlMs),
      lastUsedAt: new Date(),
    });
  }

  /** Looks up an active (not revoked, not expired) session by its refresh token's hash. */
  async findActiveByToken(refreshToken) {
    return SessionModel.findOne({
      refreshTokenHash: this.hashToken(refreshToken),
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
  }

  async revoke(sessionId, reason = "LOGOUT") {
    return SessionModel.findByIdAndUpdate(
      sessionId,
      { $set: { revokedAt: new Date(), revokedReason: reason } },
      { new: true },
    );
  }

  /** "Log out everywhere" — used on password change and by an admin revoking a compromised account. */
  async revokeAllForUser(userId, reason = "ADMIN_REVOKED") {
    return SessionModel.updateMany(
      { user: userId, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: reason } },
    );
  }

  /** IAP V2.0 Milestone 3 — "log out this device everywhere" (as distinct from "log out this one
   * session"): revokes every active session tied to a Device, e.g. after blocking it. */
  async revokeAllForDevice(deviceId, reason = "ADMIN_REVOKED") {
    return SessionModel.updateMany(
      { device: deviceId, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: reason } },
    );
  }

  async listActiveForUser(userId) {
    return SessionModel.find({ user: userId, revokedAt: null, expiresAt: { $gt: new Date() } })
      .sort({ lastUsedAt: -1 })
      .lean();
  }

  async countActiveForUser(userId) {
    return SessionModel.countDocuments({ user: userId, revokedAt: null, expiresAt: { $gt: new Date() } });
  }
}

export default new SessionService();
