import mongoose from "mongoose";
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

/**
 * Device
 * ------
 * IAP V2.0 Milestone 3 — Device Management. Phase 1/2's `Session` carried loose,
 * unvalidated `deviceLabel`/`userAgent`/`ipAddress` strings with no identity across logins — the
 * same physical POS terminal logging in twice looked like two unrelated events, so "trust this
 * device," "block this device," or "log out this device everywhere" had nothing to attach to.
 *
 * A Device is identified by `fingerprint` (brand-scoped) — a client-supplied stable identifier
 * (a hashed combination of browser/OS/hardware characteristics, or a physical terminal's own
 * serial/asset id for a fixed POS/kiosk). One Device can have many Sessions over time (re-logins
 * from the same terminal); `Session.device` links back here.
 *
 * `country`/`city`/`riskScore` are schema-ready but not populated by any code path yet — this
 * codebase has no GeoIP provider and no risk-scoring engine (see auth-policy.utils.js's header
 * comment for the same "don't fake it" stance applied consistently across this whole redesign).
 */
const deviceSchema = new Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true, index: true },
    branch: { type: ObjectId, ref: "Branch", default: null }, // set for a fixed terminal (POS/kiosk) assigned to a location

    fingerprint: { type: String, required: true },

    deviceName: { type: String, trim: true, default: null }, // Owner/employee-assigned label, e.g. "POS Terminal 1"
    deviceType: {
      type: String,
      enum: ["BROWSER", "POS_TERMINAL", "KIOSK", "KITCHEN_DISPLAY", "TABLET", "MOBILE", "UNKNOWN"],
      default: "UNKNOWN",
    },

    browser: { type: String, default: null },
    os: { type: String, default: null },

    lastIP: { type: String, default: null },
    lastCountry: { type: String, default: null }, // schema-ready — needs a GeoIP provider
    lastCity: { type: String, default: null }, // schema-ready — needs a GeoIP provider

    lastUser: { type: ObjectId, ref: "UserAccount", default: null },
    lastSeenAt: { type: Date, default: Date.now },

    trusted: { type: Boolean, default: false },
    blocked: { type: Boolean, default: false },
    blockedReason: { type: String, default: null },

    riskScore: { type: Number, default: 0, min: 0, max: 100 }, // schema-ready — needs a risk-scoring engine (Milestone 5)

    createdBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

deviceSchema.index({ brand: 1, fingerprint: 1 }, { unique: true });
deviceSchema.index({ brand: 1, lastUser: 1 });

export default mongoose.model("Device", deviceSchema);
