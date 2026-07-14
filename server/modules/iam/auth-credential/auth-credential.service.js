import crypto from "crypto";
import AuthCredentialModel from "./auth-credential.model.js";
import throwError from "../../../utils/throwError.js";
import authenticationSettingsService from "../authentication-settings/authentication-settings.service.js";
import securityEventService from "../security-event/security-event.service.js";

// Lookup-based fast-login types — deterministic HMAC lookup key, one active row per
// (brand, type, value), one active row per (principal, type) at a time (issuing a new one revokes
// the old — a cashier has exactly one live PIN, not an accumulating history of them).
const LOOKUP_TYPES = new Set(["PIN", "BARCODE", "QR"]);

const SEQUENTIAL_PATTERNS = ["0123456789", "9876543210"];

function isSequential(pin) {
  return SEQUENTIAL_PATTERNS.some((seq) => seq.includes(pin));
}

function isRepeated(pin) {
  return new Set(pin.split("")).size === 1;
}

class AuthCredentialService {
  computeLookupKey(brand, type, value) {
    const pepper = process.env.CREDENTIAL_LOOKUP_SECRET || process.env.ACCESS_TOKEN_SECRET || "";
    if (!pepper) {
      throwError("CREDENTIAL_LOOKUP_SECRET (or ACCESS_TOKEN_SECRET) must be set to issue/verify credentials.", 500);
    }
    return crypto.createHmac("sha256", pepper).update(`${brand}:${type}:${value}`).digest("hex");
  }

  /**
   * Owner Controlled Authentication: issues (or re-issues) a PIN/BARCODE/QR credential for a
   * UserAccount. Enforces AuthenticationSettings.pinPolicy for PIN (length, sequential/repeated
   * rules) — BARCODE/QR values are typically generated device-side (a physical badge, a printed
   * QR) so no length/complexity policy applies to them the same way.
   */
  async issueCredential({ brand, branch, principal, principalType = "UserAccount", type, value, createdBy, expiresAt = null }) {
    if (!LOOKUP_TYPES.has(type)) {
      throwError(`issueCredential only supports PIN/BARCODE/QR (got "${type}"). See auth-credential.model.js.`, 400);
    }
    if (!value) {
      throwError(`A value is required to issue a ${type} credential.`, 400);
    }

    if (type === "PIN") {
      const settings = await authenticationSettingsService.resolveForBrandBranch(brand, branch);
      const policy = settings.pinPolicy || {};
      if (policy.length && String(value).length !== policy.length) {
        throwError(`PIN must be exactly ${policy.length} digits.`, 400);
      }
      if (!/^\d+$/.test(String(value))) {
        throwError("PIN must be numeric.", 400);
      }
      if (!policy.allowSequential && isSequential(String(value))) {
        throwError("Sequential PINs (e.g. 1234) are not allowed by policy.", 400);
      }
      if (!policy.allowRepeated && isRepeated(String(value))) {
        throwError("Repeated-digit PINs (e.g. 1111) are not allowed by policy.", 400);
      }
    }

    const lookupKey = this.computeLookupKey(brand, type, value);

    const existingForValue = await AuthCredentialModel.findOne({ brand, type, lookupKey, status: "active" });
    if (existingForValue && String(existingForValue.principal) !== String(principal)) {
      throwError(`This ${type} is already assigned to another account in this brand.`, 409);
    }

    // Revoke any existing active credential of this type for this principal — one live PIN per
    // person, not an accumulating set (re-issuing a PIN should replace it, not add another).
    await AuthCredentialModel.updateMany(
      { principal, principalType, type, status: "active" },
      { $set: { status: "revoked", revokedAt: new Date(), revokedBy: createdBy } },
    );

    const created = await AuthCredentialModel.create({
      brand,
      branch,
      principal,
      principalType,
      type,
      lookupKey,
      status: "active",
      expiresAt,
      createdBy,
    });

    await securityEventService.record({
      brand, branch, user: principalType === "UserAccount" ? principal : null,
      eventType: `${type}_ISSUED`, success: true,
    });

    return created;
  }

  /**
   * Verifies a scanned/entered PIN/BARCODE/QR value and returns the matching, still-valid
   * credential (with its principal populated) — or null if nothing matches. Deliberately does not
   * throw on a non-match (a failed PIN attempt is an expected, common case at a shared terminal,
   * not an exceptional one) — the caller (user-auth.service.js) decides how to respond.
   */
  async verifyCredential({ brand, type, value }) {
    if (!value) return null;

    const lookupKey = this.computeLookupKey(brand, type, value);

    const credential = await AuthCredentialModel.findOne({
      brand,
      type,
      lookupKey,
      status: "active",
    }).populate("principal");

    if (!credential) return null;
    if (credential.expiresAt && credential.expiresAt < new Date()) return null;

    credential.lastUsedAt = new Date();
    await credential.save();

    return credential;
  }

  async revokeCredential({ id, brand, revokedBy }) {
    const credential = await AuthCredentialModel.findOne({ _id: id, brand });
    if (!credential) {
      throwError("Credential not found.", 404);
    }
    credential.status = "revoked";
    credential.revokedAt = new Date();
    credential.revokedBy = revokedBy;
    await credential.save();

    await securityEventService.record({
      brand, branch: credential.branch, user: credential.principalType === "UserAccount" ? credential.principal : null,
      eventType: `${credential.type}_REVOKED`, success: true,
    });

    return credential;
  }

  async listForPrincipal(principal, principalType = "UserAccount") {
    return AuthCredentialModel.find({ principal, principalType }).select("-lookupKey").sort({ createdAt: -1 }).lean();
  }
}

export default new AuthCredentialService();
