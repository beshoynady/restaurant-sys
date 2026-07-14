import mongoose from "mongoose";
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const LOGIN_METHOD_ENUM = [
  "PIN", "BARCODE", "QR", "PASSWORD", "GOOGLE", "MICROSOFT", "FACEBOOK", "APPLE",
  "PASSKEY", "SMS_OTP", "EMAIL_OTP", "MAGIC_LINK", "NFC", "RFID", "FINGERPRINT", "FACE_ID",
];

/**
 * IAP V2.0 — a role's authentication policy. Used TWICE in this file: once as
 * `defaultPolicy` (the brand/branch's baseline — every field has a real default) and once per
 * entry in `roleOverrides[]` (every field left `undefined` there means "inherit from
 * defaultPolicy" — see authentication-settings.service.js#resolveEffectivePolicy for the merge).
 *
 * Split from Phase 1's flat model specifically so a Cashier and a Manager under the same
 * brand/branch can have different session/timeout/network policy, not just different allowed
 * login methods — "Manager should have stronger security than Cashier" is only expressible if
 * these fields are per-role.
 *
 * Fields marked "schema-ready, not yet enforced" are deliberately NOT faked — the Owner can
 * already configure the intent (and it's visible/editable via this API today), but no code path
 * checks them yet because the infrastructure they depend on doesn't exist in this codebase yet
 * (requireMFA needs a TOTP verifier, allowedCountries needs a GeoIP provider). Faking enforcement
 * would be worse than being honest that it's pending — see IAP_V2_MILESTONES.md for the
 * milestone each one is scheduled under. requireDeviceTrust (Milestone 3) and the restaurant
 * operational gates requireActiveShift/requireAssignedPOS/requireAssignedDevice/requireGPS
 * (Milestone 4) ARE enforced — see user-auth.service.js#_resolveAndGateDevice and
 * #_gateOperationalPolicy.
 */
const roleAuthPolicySchema = {
  allowedMethods: { type: [String], enum: LOGIN_METHOD_ENUM },
  // Methods in this list must ALL succeed (true multi-factor stacking), not any-one-of.
  requiredMethods: { type: [String], enum: LOGIN_METHOD_ENUM },

  requireMFA: { type: Boolean }, // schema-ready — see twoFactorEnabled note in user-auth.service.js

  // --- Session ---
  maxConcurrentSessions: { type: Number, min: 0 }, // 0 = unlimited
  idleTimeoutMinutes: { type: Number, min: 0 }, // 0/null = no idle timeout
  absoluteSessionTimeoutMinutes: { type: Number, min: 0 }, // hard ceiling regardless of activity
  refreshTokenTTLDays: { type: Number, min: 0 },
  accessTokenTTLMinutes: { type: Number, min: 1 },
  rememberDeviceDays: { type: Number, min: 0 }, // schema-ready — needs the Device model (Milestone 3)

  // --- Network / Time restriction (enforced) ---
  allowedIPs: { type: [String], default: undefined }, // exact IPs or CIDR ranges
  allowedCountries: { type: [String], default: undefined }, // schema-ready — needs a GeoIP provider
  workingHours: {
    enabled: { type: Boolean },
    days: { type: [Number] }, // 0=Sunday .. 6=Saturday
    startTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ }, // "HH:mm", 24h
    endTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  },

  // --- Device / risk (schema-ready — Milestone 3: Device Management redesign) ---
  requireDeviceTrust: { type: Boolean },
  unknownDevicePolicy: { type: String, enum: ["ALLOW", "CHALLENGE", "BLOCK"] },
  riskLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },

  // --- Restaurant operational gates (Milestone 4) ---
  requireActiveShift: { type: Boolean },
  requireAssignedPOS: { type: Boolean },
  requireAssignedDevice: { type: Boolean },
  requireGPS: { type: Boolean },
  // How far (meters) a requireGPS login may be from Branch.location before it's rejected. Only
  // meaningful when requireGPS is true and the branch has a configured location — see
  // auth-policy.utils.js#isWithinGeofence for how an unconfigured branch location is handled.
  gpsRadiusMeters: { type: Number, min: 1 },
  offlineLoginAllowed: { type: Boolean },
};

const authenticationSettingsSchema = new Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },

    // The baseline every role falls back to. Unlike roleOverrides entries, every field here has a
    // concrete default — resolveEffectivePolicy() never needs to guess a value for a field the
    // Owner hasn't configured.
    defaultPolicy: {
      allowedMethods: { type: [String], enum: LOGIN_METHOD_ENUM, default: ["PASSWORD"] },
      requiredMethods: { type: [String], enum: LOGIN_METHOD_ENUM, default: [] },
      requireMFA: { type: Boolean, default: false },
      maxConcurrentSessions: { type: Number, default: 5, min: 0 },
      idleTimeoutMinutes: { type: Number, default: 0, min: 0 },
      absoluteSessionTimeoutMinutes: { type: Number, default: 0, min: 0 },
      refreshTokenTTLDays: { type: Number, default: 7, min: 0 },
      accessTokenTTLMinutes: { type: Number, default: 15, min: 1 },
      rememberDeviceDays: { type: Number, default: 0, min: 0 },
      allowedIPs: { type: [String], default: [] },
      allowedCountries: { type: [String], default: [] },
      workingHours: {
        enabled: { type: Boolean, default: false },
        days: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
        startTime: { type: String, default: "00:00" },
        endTime: { type: String, default: "23:59" },
      },
      requireDeviceTrust: { type: Boolean, default: false },
      unknownDevicePolicy: { type: String, enum: ["ALLOW", "CHALLENGE", "BLOCK"], default: "ALLOW" },
      riskLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], default: "LOW" },
      requireActiveShift: { type: Boolean, default: false },
      requireAssignedPOS: { type: Boolean, default: false },
      requireAssignedDevice: { type: Boolean, default: false },
      requireGPS: { type: Boolean, default: false },
      gpsRadiusMeters: { type: Number, default: 200, min: 1 },
      offlineLoginAllowed: { type: Boolean, default: false },
    },

    // Per-role overrides — e.g. { role: cashierRoleId, policy: { allowedMethods: ["PIN"], maxConcurrentSessions: 1 } }.
    // Any field omitted from `policy` inherits from defaultPolicy.
    roleOverrides: [
      {
        role: { type: ObjectId, ref: "Role", required: true },
        policy: roleAuthPolicySchema,
      },
    ],

    // ======================================================
    // Credential-format & brute-force policy — brand/branch-wide by nature (protects the SYSTEM,
    // not a specific account's risk profile), so intentionally NOT part of the per-role policy.
    // ======================================================
    pinPolicy: {
      length: { type: Number, default: 4, min: 4, max: 8 },
      allowSequential: { type: Boolean, default: false },
      allowRepeated: { type: Boolean, default: false },
      expiryDays: { type: Number, default: null },
    },

    passwordPolicy: {
      minLength: { type: Number, default: 8, min: 6 },
      requireUppercase: { type: Boolean, default: true },
      requireNumber: { type: Boolean, default: true },
      requireSymbol: { type: Boolean, default: false },
      expiryDays: { type: Number, default: null },
      historyCount: { type: Number, default: 0, min: 0 }, // schema-ready — needs PasswordHistory (Milestone 3)
    },

    lockoutPolicy: {
      maxAttempts: { type: Number, default: 5, min: 1 },
      lockoutDurationMinutes: { type: Number, default: 15, min: 1 },
      // Progressive delay: each additional failed attempt (up to maxAttempts) adds this many
      // seconds before the NEXT attempt is accepted, independent of the hard lockout — makes
      // brute-forcing slower even before the account fully locks. 0 = disabled.
      progressiveDelaySeconds: { type: Number, default: 0, min: 0 },
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

authenticationSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

export default mongoose.model("AuthenticationSettings", authenticationSettingsSchema);
