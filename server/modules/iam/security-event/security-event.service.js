import SecurityEventModel from "./security-event.model.js";

/**
 * IAP V2.0 Milestone 5 — records the Identity Platform's structured audit trail. `record()`
 * deliberately never throws: a logging failure (e.g. a transient DB hiccup) must never be the
 * reason a real login/logout/credential operation fails — it's caught and reported to the
 * process's own error output, not propagated into the caller's control flow.
 */
class SecurityEventService {
  async record({ brand = null, branch = null, user = null, device = null, session = null, eventType, method = null, success, reason = null, ipAddress = null, userAgent = null, metadata = null }) {
    try {
      await SecurityEventModel.create({
        brand, branch, user, device, session, eventType, method, success, reason, ipAddress, userAgent, metadata,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[security-event] Failed to record ${eventType}: ${err.message}`);
    }
  }

  async listForUser(brand, userId, limit = 50) {
    return SecurityEventModel.find({ brand, user: userId }).sort({ createdAt: -1 }).limit(limit).lean();
  }

  async listForBrand(brand, { eventType = null, success = null, limit = 100 } = {}) {
    const query = { brand };
    if (eventType) query.eventType = eventType;
    if (success !== null) query.success = success;
    return SecurityEventModel.find(query).sort({ createdAt: -1 }).limit(limit).lean();
  }

  /** Foundation for brute-force/suspicious-login review: count of failed logins for an identifier
   * or IP within a time window. Not wired into any automatic block/alert decision yet — that's a
   * risk-scoring engine this codebase doesn't have (see device.model.js's riskScore note); this is
   * the query a future one would be built on. */
  async countRecentFailures({ brand, ipAddress, windowMs = 15 * 60 * 1000 }) {
    return SecurityEventModel.countDocuments({
      brand,
      eventType: "LOGIN_FAILED",
      ipAddress,
      createdAt: { $gte: new Date(Date.now() - windowMs) },
    });
  }
}

export default new SecurityEventService();
