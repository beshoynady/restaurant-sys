import mongoose from "mongoose";
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

/**
 * Session
 * -------
 * IAM Platform Redesign (V4.0) — replaces `UserAccount.refreshToken` (a single string field,
 * meaning one user could only ever have ONE active login; a second device silently invalidated
 * the first, and there was no way to revoke one device without logging out everywhere). One row
 * per active login — enables multi-device sessions, per-device revocation ("log out this
 * device"), and refresh-token rotation (a stolen refresh token can be detected and the whole
 * session chain revoked, not just outlived).
 *
 * The raw refresh token is never stored — only its SHA-256 hash (`refreshTokenHash`), the same
 * reasoning as never storing a plaintext password: a database read (backup leak, insider access)
 * must not hand out a working credential.
 */
const sessionSchema = new Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true, index: true },
    user: { type: ObjectId, ref: "UserAccount", required: true, index: true },

    refreshTokenHash: { type: String, required: true, unique: true },

    // Rotation chain: when a refresh token is used, this session is revoked and a new one is
    // created referencing it here — lets a security review trace "this token was used N times,
    // rotated each time" vs. "used twice from two different places" (replay/theft signal).
    rotatedFrom: { type: ObjectId, ref: "Session", default: null },

    // IAP V2.0 Milestone 3: linked to the Device registry when the client supplies a
    // fingerprint — optional (a session can still exist without a registered device, e.g. a
    // client that hasn't adopted device fingerprinting yet). `deviceLabel`/`ipAddress`/
    // `userAgent` are kept as a per-session snapshot even when `device` is set (a device's own
    // `browser`/`os`/`lastIP` reflect its MOST RECENT session, not this specific one).
    device: { type: ObjectId, ref: "Device", default: null, index: true },
    deviceLabel: { type: String, trim: true, default: null }, // e.g. "POS Terminal 1", set by the client
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },

    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, default: Date.now },

    revokedAt: { type: Date, default: null },
    // `null` must be listed explicitly — Mongoose's enum validator rejects the literal value
    // `null` unless it's in the enum array itself, even though it's this field's own default.
    revokedReason: {
      type: String,
      enum: ["LOGOUT", "ROTATED", "ADMIN_REVOKED", "PASSWORD_CHANGED", "EXPIRED", null],
      default: null,
    },
  },
  { timestamps: true },
);

sessionSchema.index({ user: 1, revokedAt: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL cleanup of expired sessions

export default mongoose.model("Session", sessionSchema);
