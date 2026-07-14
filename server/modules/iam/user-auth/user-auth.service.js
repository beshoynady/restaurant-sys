import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import throwError from "../../../utils/throwError.js";
import { signAccessToken, signRefreshToken } from "../../../utils/jwt.utils.js";
import User from "../user-account/user-account.model.js";
import authenticationSettingsService from "../authentication-settings/authentication-settings.service.js";
import authCredentialService from "../auth-credential/auth-credential.service.js";
import sessionService from "../session/session.service.js";
import deviceService from "../device/device.service.js";
import securityEventService from "../security-event/security-event.service.js";
import Employee from "../../hr/employee/employee.model.js";
import AttendanceRecord from "../../hr/attendance-record/attendance-record.model.js";
import CashierShift from "../../finance/cashier-shift/cashier-shift.model.js";
import Branch from "../../organization/branch/branch.model.js";
import { isWithinWorkingHours, isIPAllowed, isSessionIdleExpired, resolveSessionTTLMs, isWithinGeofence } from "../authentication-settings/auth-policy.utils.js";

/**
 * IAP V2.0 — Authentication Policy Engine.
 *
 * Every login method resolves ONE effective policy (Milestone 2), runs the shared gate sequence
 * (method-allowed, working-hours, IP-allowlist, lockout, device-trust — Milestone 3) before
 * issuing a session, and now (Milestone 5) records a SecurityEvent for every meaningful outcome —
 * success, every distinct failure reason, and account lockout. Session rotation itself is
 * deliberately NOT logged per-refresh (every 15 minutes per active user, by default policy, would
 * make the security trail mostly noise) — only revocations (logout, idle-expiry, admin action)
 * are, since those are the events an actual security review cares about.
 *
 * Progressive delay (Milestone 5): each failed password attempt is delayed by
 * `lockoutPolicy.progressiveDelaySeconds * attempts` (capped at 30s) before the rejection is
 * returned — independent of the hard lockout, this alone makes scripted brute-forcing
 * meaningfully slower well before an account locks.
 */
class AuthService {
  async login({ identifier, password, brand = null, branch = null, deviceFingerprint = null, deviceType = null, deviceLabel = null, browser = null, os = null, ipAddress = null, userAgent = null, gps = null }) {
    if (!identifier || !password) {
      throwError("Identifier and password are required", 400);
    }

    const query = {
      isDeleted: false,
      isActive: true,
      $or: [
        { username: identifier.toLowerCase() },
        { email: identifier.toLowerCase() },
        { phone: identifier },
      ],
    };
    // Scoping by brand when supplied closes a real cross-tenant ambiguity: `username` is only
    // unique per-{brand,username}, so two different brands can share a username, and an unscoped
    // lookup would silently return whichever Mongo finds first. Optional for backward
    // compatibility with callers that don't send one yet.
    if (brand) query.brand = brand;

    const user = await User.findOne(query).select("+password").populate("role");
    if (!user) {
      await securityEventService.record({ brand, eventType: "LOGIN_FAILED", method: "PASSWORD", success: false, reason: "Unknown identifier", ipAddress, userAgent });
      throwError("Invalid credentials", 401);
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      await securityEventService.record({ brand: user.brand, user: user._id, eventType: "LOGIN_FAILED", method: "PASSWORD", success: false, reason: "Account locked", ipAddress, userAgent });
      throwError(`Account is locked. Try again after ${user.lockUntil.toISOString()}.`, 423);
    }

    let employee, effectiveBranch;
    try {
      ({ employee, effectiveBranch } = await this._resolveIdentityBranch(user, branch));
    } catch (err) {
      await securityEventService.record({ brand: user.brand, user: user._id, eventType: "LOGIN_FAILED", method: "PASSWORD", success: false, reason: err.message, ipAddress, userAgent });
      throw err;
    }

    const effective = await authenticationSettingsService.resolveEffectivePolicy(user.brand, effectiveBranch, user.role?._id);

    try {
      this._gateLoginPolicy(effective.policy, "PASSWORD", ipAddress);
    } catch (err) {
      await securityEventService.record({ brand: user.brand, user: user._id, eventType: "LOGIN_FAILED", method: "PASSWORD", success: false, reason: err.message, ipAddress, userAgent });
      throw err;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      await this._registerFailedAttempt(user, effective.lockoutPolicy, ipAddress, userAgent);
      await securityEventService.record({ brand: user.brand, user: user._id, eventType: "LOGIN_FAILED", method: "PASSWORD", success: false, reason: "Invalid password", ipAddress, userAgent });
      await this._applyProgressiveDelay((user.loginAttempts || 0) + 1, effective.lockoutPolicy);
      throwError("Invalid credentials", 401);
    }

    const device = await this._resolveAndGateDevice(effective.policy, {
      brand: user.brand, deviceFingerprint, deviceType, browser, os, ipAddress, userId: user._id,
    }, { method: "PASSWORD", userAgent });

    await this._gateOperationalPolicy(effective.policy, {
      brand: user.brand, branch: effectiveBranch, employee, device, gps,
    }, { method: "PASSWORD", userId: user._id, ipAddress, userAgent });

    const result = await this._issueSession(user, effective.policy, { device: device?._id, deviceLabel, ipAddress, userAgent });
    await securityEventService.record({ brand: user.brand, user: user._id, device: device?._id, eventType: "LOGIN_SUCCESS", method: "PASSWORD", success: true, ipAddress, userAgent });
    return result;
  }

  /**
   * Owner Controlled Authentication — shared-terminal fast login (Cashier PIN, Kitchen QR, ...).
   * Unlike login(), there is no separate "identifier" step: the PIN/barcode/QR value itself is
   * looked up directly (see auth-credential.service.js's lookupKey design).
   */
  async loginWithCredential({ brand, branch = null, type, value, deviceFingerprint = null, deviceType = null, deviceLabel = null, browser = null, os = null, ipAddress = null, userAgent = null, gps = null }) {
    if (!brand || !type || !value) {
      throwError("brand, type, and value are required.", 400);
    }

    const credential = await authCredentialService.verifyCredential({ brand, type, value });
    if (!credential || !credential.principal) {
      await securityEventService.record({ brand, eventType: "LOGIN_FAILED", method: type, success: false, reason: "Invalid credential", ipAddress, userAgent });
      throwError("Invalid credentials", 401);
    }

    const user = await User.findById(credential.principal._id).populate("role");
    if (!user || user.isDeleted || !user.isActive) {
      await securityEventService.record({ brand, eventType: "LOGIN_FAILED", method: type, success: false, reason: "Account inactive", ipAddress, userAgent });
      throwError("Invalid credentials", 401);
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      await securityEventService.record({ brand, user: user._id, eventType: "LOGIN_FAILED", method: type, success: false, reason: "Account locked", ipAddress, userAgent });
      throwError(`Account is locked. Try again after ${user.lockUntil.toISOString()}.`, 423);
    }

    let employee, effectiveBranch;
    try {
      ({ employee, effectiveBranch } = await this._resolveIdentityBranch(user, branch));
    } catch (err) {
      await securityEventService.record({ brand, user: user._id, eventType: "LOGIN_FAILED", method: type, success: false, reason: err.message, ipAddress, userAgent });
      throw err;
    }

    const effective = await authenticationSettingsService.resolveEffectivePolicy(brand, effectiveBranch, user.role?._id);

    try {
      this._gateLoginPolicy(effective.policy, type, ipAddress);
    } catch (err) {
      await securityEventService.record({ brand, user: user._id, eventType: "LOGIN_FAILED", method: type, success: false, reason: err.message, ipAddress, userAgent });
      throw err;
    }

    const device = await this._resolveAndGateDevice(effective.policy, {
      brand, deviceFingerprint, deviceType, browser, os, ipAddress, userId: user._id,
    }, { method: type, userAgent, user: user._id });

    await this._gateOperationalPolicy(effective.policy, {
      brand, branch: effectiveBranch, employee, device, gps,
    }, { method: type, userId: user._id, ipAddress, userAgent });

    const result = await this._issueSession(user, effective.policy, { device: device?._id, deviceLabel, ipAddress, userAgent });
    await securityEventService.record({ brand, user: user._id, device: device?._id, eventType: "LOGIN_SUCCESS", method: type, success: true, ipAddress, userAgent });
    return result;
  }

  /** Shared gate sequence: method-allowed, working-hours, IP-allowlist — every login method runs
   * through exactly this, in this order, so the rejection reason is always the first one that
   * actually applies. */
  _gateLoginPolicy(policy, method, ipAddress) {
    if (!(policy.allowedMethods || []).includes(method)) {
      throwError(`${method} login is not enabled for this account's role.`, 403);
    }
    if (!isWithinWorkingHours(policy)) {
      throwError("Login is not permitted outside configured working hours for this role.", 403);
    }
    if (!isIPAllowed(policy, ipAddress)) {
      throwError("Login is not permitted from this network for this role.", 403);
    }
  }

  /** IAP V2.0 Milestone 3 — Device Management gate. No-op (returns null) if the client didn't
   * supply a fingerprint; not every client has adopted device fingerprinting yet. */
  async _resolveAndGateDevice(policy, { brand, deviceFingerprint, deviceType, browser, os, ipAddress, userId }, logCtx = {}) {
    if (!deviceFingerprint) return null;

    const device = await deviceService.findOrRegister({
      brand, fingerprint: deviceFingerprint, deviceType, browser, os, ipAddress, userId, createdBy: userId,
    });

    if (device.blocked) {
      await securityEventService.record({ brand, user: userId, device: device._id, eventType: "LOGIN_FAILED", method: logCtx.method, success: false, reason: "Device blocked", ipAddress, userAgent: logCtx.userAgent });
      throwError("This device has been blocked. Contact your administrator.", 403);
    }

    if (policy.requireDeviceTrust && !device.trusted) {
      if (policy.unknownDevicePolicy === "BLOCK") {
        await securityEventService.record({ brand, user: userId, device: device._id, eventType: "LOGIN_FAILED", method: logCtx.method, success: false, reason: "Untrusted device", ipAddress, userAgent: logCtx.userAgent });
        throwError("This device is not trusted. Login from an approved device or contact your administrator.", 403);
      }
      // CHALLENGE has no second-factor mechanism to actually challenge with yet — see this file's
      // header comment. Falls through (same as ALLOW) rather than silently blocking on a policy
      // value that can't be honored, or pretending to have challenged when nothing happened.
    }

    return device;
  }

  /**
   * IASP Phase 5 — resolves branch authority once per login and reuses it both for
   * AuthenticationSettings resolution and the operational gates (avoiding a second Employee
   * lookup). See server/IDENTITY_MODEL.md §2.2 for the full audit finding this fixes:
   * `UserAccount.branch` and `Employee.defaultBranch` could previously disagree with nothing to
   * catch it, silently mis-scoping the login-time operational gates against the wrong branch.
   *
   * Authority order: an explicit request-supplied `requestedBranch` wins (a fixed POS terminal or
   * a client-selected branch for a multi-branch employee) — but for an employee-linked account it
   * MUST be one of that employee's assigned `branches`, or the login is rejected outright rather
   * than silently trusting an unverified claim. Otherwise: the Employee's own `defaultBranch` (the
   * HR-owned source of truth) for employee-linked accounts, falling back to `UserAccount.branch`
   * only for standalone accounts (Owner/Admin) that have no Employee record at all.
   */
  async _resolveIdentityBranch(user, requestedBranch) {
    const employee = user.employee
      ? await Employee.findById(user.employee).select("defaultBranch branches assignedDevice")
      : null;

    if (employee && requestedBranch) {
      const allowed = (employee.branches || []).some((b) => String(b) === String(requestedBranch));
      if (!allowed) {
        throwError("This employee is not assigned to the requested branch.", 403);
      }
    }

    const effectiveBranch = requestedBranch ?? employee?.defaultBranch ?? user.branch;
    return { employee, effectiveBranch };
  }

  /**
   * IAP V2.0 Milestone 4 — Restaurant Operational Policy Gates. Checks the four gates against real
   * HR/POS state (not faked): a Cashier's requireActiveShift is only satisfied by an actual open
   * AttendanceRecord for today, requireAssignedPOS by an actual OPEN CashierShift, etc. — these are
   * configurable per-role via AuthenticationSettings, never hardcoded to a specific role name.
   *
   * `employee` is pre-resolved by `_resolveIdentityBranch()` (called earlier in login()/
   * loginWithCredential() for branch authority regardless of whether any gate is on) and passed in
   * here rather than re-fetched, so an employee-linked login never queries `Employee` twice.
   */
  async _gateOperationalPolicy(policy, { brand, branch, employee, device, gps }, logCtx) {
    const needsEmployee = policy.requireActiveShift || policy.requireAssignedPOS || policy.requireAssignedDevice;
    if (!needsEmployee && !policy.requireGPS) return;

    const fail = async (reason) => {
      await securityEventService.record({ brand, user: logCtx.userId, device: device?._id, eventType: "LOGIN_FAILED", method: logCtx.method, success: false, reason, ipAddress: logCtx.ipAddress, userAgent: logCtx.userAgent });
      throwError(reason, 403);
    };

    if (needsEmployee && !employee) {
      await fail("This account has no linked employee record; the restaurant operational policy for this role cannot be verified.");
    }

    if (policy.requireActiveShift) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const openAttendance = await AttendanceRecord.findOne({
        brand, branch, employee: employee._id,
        currentDate: { $gte: startOfDay, $lte: endOfDay },
        arrivalTime: { $ne: null }, departureTime: null,
        isDeleted: false,
      });
      if (!openAttendance) {
        await fail("No active shift found. Clock in before logging in.");
      }
    }

    if (policy.requireAssignedPOS) {
      const openCashierShift = await CashierShift.findOne({ brand, branch, cashier: employee._id, status: "OPEN" });
      if (!openCashierShift) {
        await fail("No assigned, open POS register found for this employee.");
      }
    }

    if (policy.requireAssignedDevice) {
      if (!device || !employee.assignedDevice || String(employee.assignedDevice) !== String(device._id)) {
        await fail("This employee is not assigned to log in from this device.");
      }
    }

    if (policy.requireGPS) {
      const branchDoc = branch ? await Branch.findById(branch).select("location") : null;
      const geofence = isWithinGeofence(branchDoc?.location, gps, policy.gpsRadiusMeters);
      if (!geofence.allowed) {
        await fail(geofence.reason);
      }
    }
  }

  async refresh(token, meta = {}) {
    if (!token) throwError("Refresh token required", 400);

    let payload;
    try {
      payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch {
      throwError("Invalid refresh token", 403);
    }

    const session = await sessionService.findActiveByToken(token);
    if (!session) {
      throwError("Session not found, expired, or already revoked", 403);
    }

    const user = await User.findById(payload.id).populate("role");
    if (!user || user.isDeleted) {
      throwError("User not found", 404);
    }
    if (!user.isActive) {
      throwError("User inactive", 403);
    }

    const effective = await authenticationSettingsService.resolveEffectivePolicy(user.brand, user.branch, user.role?._id);

    // Idle timeout is checked here, not on every authenticated request — refresh() already does a
    // DB read for the Session anyway (zero added cost), whereas checking it on every single
    // access-token-authenticated request would mean a new per-request DB lookup on a currently
    // fully-stateless JWT path (middlewares/authenticate.js) — a real performance-tradeoff
    // decision, not an oversight, see IAP_V2_MILESTONES.md.
    if (isSessionIdleExpired(effective.policy, session.lastUsedAt)) {
      await sessionService.revoke(session._id, "EXPIRED");
      await securityEventService.record({ brand: user.brand, user: user._id, device: session.device, session: session._id, eventType: "SESSION_REVOKED", success: false, reason: "Idle timeout", ipAddress: meta.ipAddress, userAgent: meta.userAgent });
      throwError("Session expired due to inactivity.", 403);
    }

    await sessionService.revoke(session._id, "ROTATED");

    // The device was already vetted when this session's chain started (login time) — rotation
    // carries it forward rather than re-running the device gate on every refresh.
    const { accessToken, refreshToken } = await this._issueTokens(user, effective.policy, {
      ...meta,
      device: session.device,
      rotatedFrom: session._id,
    });

    return { accessToken, refreshToken };
  }

  async logout(refreshToken, meta = {}) {
    if (!refreshToken) return;
    const session = await sessionService.findActiveByToken(refreshToken);
    if (session) {
      await sessionService.revoke(session._id, "LOGOUT");
      await securityEventService.record({ brand: session.brand, user: session.user, device: session.device, session: session._id, eventType: "LOGOUT", success: true, ipAddress: meta.ipAddress, userAgent: meta.userAgent });
    }
  }

  /** Admin/self "log out everywhere" — also the correct response to a password change (a
   * compromised password should invalidate every existing session, not just future logins). */
  async logoutAllSessions(userId, brand = null) {
    const result = await sessionService.revokeAllForUser(userId, "ADMIN_REVOKED");
    await securityEventService.record({ brand, user: userId, eventType: "LOGOUT_ALL", success: true });
    return result;
  }

  async _registerFailedAttempt(user, lockoutPolicy, ipAddress = null, userAgent = null) {
    const maxAttempts = lockoutPolicy.maxAttempts || 5;
    const attempts = (user.loginAttempts || 0) + 1;

    const update = { loginAttempts: attempts };
    let locked = false;
    if (attempts >= maxAttempts) {
      update.lockUntil = new Date(Date.now() + (lockoutPolicy.lockoutDurationMinutes || 15) * 60 * 1000);
      update.loginAttempts = 0;
      locked = true;
    }

    await User.updateOne({ _id: user._id }, { $set: update });

    if (locked) {
      await securityEventService.record({ brand: user.brand, user: user._id, eventType: "ACCOUNT_LOCKED", success: true, reason: `${maxAttempts} failed attempts`, ipAddress, userAgent });
    }
  }

  /** Progressive delay: each additional failed attempt (before the hard lockout) adds friction,
   * capped at 30s so a misconfigured policy can't hang a request indefinitely. 0/unset = disabled. */
  async _applyProgressiveDelay(attempts, lockoutPolicy) {
    const perAttemptSeconds = lockoutPolicy.progressiveDelaySeconds || 0;
    if (perAttemptSeconds <= 0) return;
    const delayMs = Math.min(attempts * perAttemptSeconds * 1000, 30000);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  async _issueTokens(user, policy, { device = null, deviceLabel, ipAddress, userAgent, rotatedFrom = null } = {}) {
    const accessTTL = `${policy.accessTokenTTLMinutes || 15}m`;
    const ttlMs = resolveSessionTTLMs(policy);

    if (policy.maxConcurrentSessions) {
      const activeCount = await sessionService.countActiveForUser(user._id);
      if (activeCount >= policy.maxConcurrentSessions) {
        const active = await sessionService.listActiveForUser(user._id);
        const oldest = active[active.length - 1];
        if (oldest) {
          await sessionService.revoke(oldest._id, "ADMIN_REVOKED");
        }
      }
    }

    // The refresh token embeds the session id as a claim (jwt.utils.js's `sid`), but the Session
    // row needs the token's hash to exist first — pre-generating the _id breaks that
    // chicken-and-egg dependency without a two-step create-then-update.
    const sessionId = new mongoose.Types.ObjectId();
    const accessToken = signAccessToken(user, accessTTL);
    // Passed as a number of seconds (not a "Nd" string) — jsonwebtoken's `expiresIn` accepts
    // either, but a fractional day string (e.g. from a sub-1-day absoluteSessionTimeoutMinutes
    // policy) isn't reliably parsed by the `ms` string-duration format it uses internally.
    const refreshToken = signRefreshToken(user, sessionId, Math.max(Math.round(ttlMs / 1000), 1));

    await sessionService.create({
      _id: sessionId,
      brand: user.brand,
      user: user._id,
      refreshToken,
      ttlMs,
      device,
      deviceLabel,
      ipAddress,
      userAgent,
      rotatedFrom,
    });

    return { accessToken, refreshToken };
  }

  async _issueSession(user, policy, meta) {
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    const { accessToken, refreshToken } = await this._issueTokens(user, policy, meta);

    return {
      user: this.sanitize(user),
      accessToken,
      refreshToken,
    };
  }

  sanitize(user) {
    const obj = user.toObject();
    delete obj.password;
    delete obj.twoFactorSecret;
    delete obj.resetPasswordToken;
    delete obj.resetPasswordExpires;
    return obj;
  }
}

export default new AuthService();
