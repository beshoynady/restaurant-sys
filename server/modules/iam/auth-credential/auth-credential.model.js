import mongoose from "mongoose";
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

/**
 * AuthCredential
 * ---------------
 * IAM Platform Redesign (V4.0) — the pluggable-login-method foundation. Represents ONE
 * credential of a given type attached to a principal (currently only "UserAccount" — staff
 * identity; Customer identity already has its own separate auth stack in crm/customer-auth and is
 * intentionally out of this phase's scope).
 *
 * Scope of this phase: PIN, BARCODE, QR — the concrete restaurant fast-login methods the owner
 * asked for (Cashier PIN/Barcode/QR, Kitchen QR/PIN), which need no external provider. PASSWORD
 * remains on `UserAccount.password` for now (already working; migrating it into this model is a
 * separate, larger follow-up — see AUTH_PLATFORM.md). OAuth providers (Google/Microsoft/Facebook/
 * Apple), Passkey (FIDO2), OTP (SMS/Email), and Magic Link are represented in the `type` enum so
 * AuthenticationSettings can reference them in policy today, but this phase does not implement a
 * verifier for any of them — there is no real OAuth app registration, SMS gateway, or WebAuthn
 * relying-party configured anywhere in this codebase to verify against, and fabricating one would
 * be worse than leaving it unimplemented. Building a verifier for a given method later means
 * adding one function to auth-credential.service.js — this schema does not need to change.
 *
 * Lookup strategy: PIN/BARCODE/QR are used in "shared terminal" contexts where the credential
 * value itself is effectively the only input (no separate username step) — so verification needs
 * fast, indexed equality lookup, which a slow, salted bcrypt hash cannot provide. `lookupKey`
 * (HMAC-SHA256 with a server-side pepper, deterministic) is what's actually queried; it is not
 * reversible, but two equal secrets always hash to the same value, enabling `findOne({lookupKey})`
 * instead of scanning-and-comparing every active credential in a brand. This is the same reasoning
 * real POS systems (Foodics, Toast) apply to PIN-based cashier login.
 */
const authCredentialSchema = new Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true, index: true },
    branch: { type: ObjectId, ref: "Branch", default: null },

    principalType: {
      type: String,
      enum: ["UserAccount"],
      required: true,
      default: "UserAccount",
    },
    principal: { type: ObjectId, refPath: "principalType", required: true, index: true },

    type: {
      type: String,
      enum: [
        "PIN",
        "BARCODE",
        "QR",
        "PASSWORD",
        "GOOGLE",
        "MICROSOFT",
        "FACEBOOK",
        "APPLE",
        "PASSKEY",
        "SMS_OTP",
        "EMAIL_OTP",
        "MAGIC_LINK",
      ],
      required: true,
    },

    // Deterministic HMAC-SHA256 lookup key for fast-login types (PIN/BARCODE/QR). Not set for
    // types that authenticate via a separate identifier step (PASSWORD uses username/email
    // lookup on UserAccount itself; OAuth providers use their own subject id).
    lookupKey: { type: String, default: null, select: false },

    status: {
      type: String,
      enum: ["active", "revoked", "expired"],
      default: "active",
      index: true,
    },

    lastUsedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },

    // Free-form context (e.g. which terminal a QR code was issued for) — not security-sensitive.
    metadata: { type: Schema.Types.Mixed, default: null },

    createdBy: { type: ObjectId, ref: "UserAccount", default: null },
    revokedBy: { type: ObjectId, ref: "UserAccount", default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One active lookup-based credential of a given type per brand — prevents two employees from
// being issued colliding PINs/barcodes within the same tenant. Partial: only enforced when
// lookupKey is actually set (PASSWORD/OAuth rows leave it null and aren't subject to this).
authCredentialSchema.index(
  { brand: 1, type: 1, lookupKey: 1 },
  { unique: true, partialFilterExpression: { lookupKey: { $type: "string" } } },
);

authCredentialSchema.index({ principal: 1, type: 1, status: 1 });

export default mongoose.model("AuthCredential", authCredentialSchema);
