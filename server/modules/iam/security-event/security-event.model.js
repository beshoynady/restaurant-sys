import mongoose from "mongoose";
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

/**
 * SecurityEvent
 * -------------
 * IAP V2.0 Milestone 5 — a dedicated, structured audit trail for the Identity Platform. Kept
 * separate from `modules/audit-log` (the existing generic per-HTTP-request logger, whose `event`
 * enum is narrow — create/update/delete/request — and whose shape has no room for "which login
 * method," "which device," "why did this fail") — this is purpose-built for authentication/
 * security review: "show me every failed login for this user in the last hour," "show me every
 * device-trust change," which the generic logger cannot answer without inspecting raw HTTP paths.
 *
 * `user` is nullable — a failed login against an identifier that doesn't match any account still
 * needs to be logged (that's exactly the brute-force/enumeration signal a security review wants),
 * and there's no user id to attach it to.
 */
const securityEventSchema = new Schema(
  {
    brand: { type: ObjectId, ref: "Brand", default: null, index: true }, // null only for a pre-brand-resolution failed lookup
    branch: { type: ObjectId, ref: "Branch", default: null },

    user: { type: ObjectId, ref: "UserAccount", default: null, index: true },
    device: { type: ObjectId, ref: "Device", default: null },
    session: { type: ObjectId, ref: "Session", default: null },

    eventType: {
      type: String,
      enum: [
        "LOGIN_SUCCESS", "LOGIN_FAILED",
        "LOGOUT", "LOGOUT_ALL",
        "ACCOUNT_LOCKED", "ACCOUNT_UNLOCKED",
        "PASSWORD_CHANGED",
        "PIN_ISSUED", "PIN_REVOKED",
        "BARCODE_ISSUED", "BARCODE_REVOKED",
        "QR_ISSUED", "QR_REVOKED",
        "SESSION_ROTATED", "SESSION_REVOKED",
        "DEVICE_REGISTERED", "DEVICE_TRUSTED", "DEVICE_BLOCKED",
        // System Setup V2 — ONBOARDING_API_DESIGN.md §5: every onboarding attempt is auditable.
        "ONBOARDING_STARTED", "ONBOARDING_STEP_COMPLETED", "ONBOARDING_FAILED",
        "ONBOARDING_COMPLETED", "ONBOARDING_CANCELLED",
      ],
      required: true,
      index: true,
    },

    method: {
      type: String,
      enum: [
        "PIN", "BARCODE", "QR", "PASSWORD", "GOOGLE", "MICROSOFT", "FACEBOOK", "APPLE",
        "PASSKEY", "SMS_OTP", "EMAIL_OTP", "MAGIC_LINK", "NFC", "RFID", "FINGERPRINT", "FACE_ID",
        null,
      ],
      default: null,
    },

    success: { type: Boolean, required: true, index: true },
    reason: { type: String, trim: true, maxlength: 300, default: null },

    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },

    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

securityEventSchema.index({ brand: 1, createdAt: -1 });
securityEventSchema.index({ brand: 1, user: 1, createdAt: -1 });
securityEventSchema.index({ brand: 1, eventType: 1, success: 1, createdAt: -1 });

export default mongoose.model("SecurityEvent", securityEventSchema);
