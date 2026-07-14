/**
 * IAP V2.0 — pure policy-check functions used by user-auth.service.js. Kept separate from the
 * service layer (no I/O, no throws — just booleans/reasons) specifically so each rule can be unit
 * tested against a plain policy object without a database.
 */

/** Working-hours + weekday restriction. Same-day ranges only (e.g. "09:00"-"22:00") — an
 * overnight-spanning range (e.g. "22:00"-"02:00") is not yet supported; document this limitation
 * rather than silently mishandle it — see IAP_V2_MILESTONES.md. */
export function isWithinWorkingHours(policy, now = new Date()) {
  const wh = policy.workingHours;
  if (!wh || !wh.enabled) return true;

  const day = now.getDay();
  if (Array.isArray(wh.days) && wh.days.length > 0 && !wh.days.includes(day)) {
    return false;
  }

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = (wh.startTime || "00:00").split(":").map(Number);
  const [endH, endM] = (wh.endTime || "23:59").split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return minutesNow >= startMinutes && minutesNow <= endMinutes;
  }
  // Overnight range (start > end, e.g. 22:00-02:00) — not supported; treat as always-allowed
  // rather than silently locking everyone out due to a config shape we don't handle correctly.
  return true;
}

function ipToInt(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
  return parts.reduce((acc, p) => acc * 256 + p, 0);
}

function isIPv4InCidr(ip, cidr) {
  const [range, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  const ipInt = ipToInt(ip);
  const rangeInt = ipToInt(range);
  if (ipInt === null || rangeInt === null || Number.isNaN(bits)) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

/** IP allowlist. Empty/unset `allowedIPs` means "no restriction" (allow all) — an allowlist is
 * opt-in. IPv4 only (exact match or CIDR); an IPv6 address against an IPv4-only allowlist is
 * rejected. */
export function isIPAllowed(policy, ip) {
  const allowed = policy.allowedIPs;
  if (!allowed || allowed.length === 0) return true;
  if (!ip) return false;

  const bareIp = ip.replace("::ffff:", ""); // normalize IPv4-mapped IPv6 (common behind proxies)

  return allowed.some((entry) => {
    if (entry.includes("/")) return isIPv4InCidr(bareIp, entry);
    return entry === bareIp;
  });
}

/** Session idle timeout — `lastUsedAt` is the session's own field (updated on every refresh). */
export function isSessionIdleExpired(policy, lastUsedAt, now = new Date()) {
  const idleMinutes = policy.idleTimeoutMinutes;
  if (!idleMinutes || idleMinutes <= 0) return false;
  const idleMs = now.getTime() - new Date(lastUsedAt).getTime();
  return idleMs > idleMinutes * 60 * 1000;
}

/** Effective refresh-token/session TTL: the tighter of refreshTokenTTLDays and
 * absoluteSessionTimeoutMinutes (a hard ceiling independent of how often the token is refreshed). */
export function resolveSessionTTLMs(policy) {
  const refreshTTLMs = (policy.refreshTokenTTLDays || 7) * 24 * 60 * 60 * 1000;
  const absoluteMs = policy.absoluteSessionTimeoutMinutes
    ? policy.absoluteSessionTimeoutMinutes * 60 * 1000
    : null;

  if (absoluteMs && absoluteMs < refreshTTLMs) return absoluteMs;
  return refreshTTLMs;
}

/** Great-circle distance between two lat/lng points, in meters (haversine formula). Real math, no
 * external provider — this is geometry against a GPS coordinate the client already sent, not a
 * GeoIP lookup (which this codebase doesn't have). */
export function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius, meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * IAP V2.0 Milestone 4 — requireGPS check. `branchLocation` is a Branch document's GeoJSON
 * `location` field (`{type:"Point", coordinates:[lng,lat]}`) or null/undefined if the branch has
 * none configured. Returns `{ allowed, reason }` rather than a bare boolean because "branch has no
 * configured location" and "employee sent no GPS coordinates" and "employee is too far away" are
 * three different admin-facing messages, not one generic rejection.
 */
export function isWithinGeofence(branchLocation, gps, radiusMeters) {
  if (!branchLocation || !Array.isArray(branchLocation.coordinates) || branchLocation.coordinates.length !== 2) {
    return { allowed: false, reason: "Branch has no configured GPS location; contact an administrator." };
  }
  if (!gps || typeof gps.lat !== "number" || typeof gps.lng !== "number") {
    return { allowed: false, reason: "Location was not provided by the client." };
  }

  const [branchLng, branchLat] = branchLocation.coordinates;
  const distance = haversineDistanceMeters(gps.lat, gps.lng, branchLat, branchLng);
  if (distance > (radiusMeters || 200)) {
    return { allowed: false, reason: `Location is ${Math.round(distance)}m from the branch, outside the allowed ${radiusMeters || 200}m radius.` };
  }
  return { allowed: true, reason: null };
}
