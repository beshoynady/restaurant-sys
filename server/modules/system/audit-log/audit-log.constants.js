/**
 * -----------------------------------------------------------------------------
 * Audit Log Constants
 * -----------------------------------------------------------------------------
 * Centralized constants used by the Audit Log module.
 *
 * NOTE:
 * Never use hard-coded strings inside the Audit module.
 * Import constants from this file instead.
 * -----------------------------------------------------------------------------
 */

/* -------------------------------------------------------------------------- */
/*                               Storage Mode                                 */
/* -------------------------------------------------------------------------- */

export const AUDIT_STORAGE_MODE = Object.freeze({
  HYBRID: "HYBRID",
  SNAPSHOT: "SNAPSHOT",
  DIFF: "DIFF",
});

/* -------------------------------------------------------------------------- */
/*                                Actions                                     */
/* -------------------------------------------------------------------------- */

export const AUDIT_ACTIONS = Object.freeze({
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  RESTORE: "RESTORE",

  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",

  OPEN_SHIFT: "OPEN_SHIFT",
  CLOSE_SHIFT: "CLOSE_SHIFT",

  APPROVE: "APPROVE",
  REJECT: "REJECT",

  PAYMENT: "PAYMENT",
  REFUND: "REFUND",

  PRINT: "PRINT",
  EXPORT: "EXPORT",
  IMPORT: "IMPORT",

  SEND_EMAIL: "SEND_EMAIL",
  SEND_SMS: "SEND_SMS",
  SEND_NOTIFICATION: "SEND_NOTIFICATION",

  STOCK_IN: "STOCK_IN",
  STOCK_OUT: "STOCK_OUT",
  STOCK_TRANSFER: "STOCK_TRANSFER",
  STOCK_ADJUSTMENT: "STOCK_ADJUSTMENT",

  CHECK_IN: "CHECK_IN",
  CHECK_OUT: "CHECK_OUT",

  GENERATE_REPORT: "GENERATE_REPORT",

  CUSTOM: "CUSTOM",
});

/* -------------------------------------------------------------------------- */
/*                                Categories                                  */
/* -------------------------------------------------------------------------- */

export const AUDIT_CATEGORIES = Object.freeze({
  SYSTEM: "SYSTEM",
  SECURITY: "SECURITY",
  AUTH: "AUTH",

  MENU: "MENU",
  SALES: "SALES",
  PURCHASE: "PURCHASE",
  INVENTORY: "INVENTORY",
  ACCOUNTING: "ACCOUNTING",
  FINANCE: "FINANCE",
  HR: "HR",

  PAYMENT: "PAYMENT",

  CUSTOMER: "CUSTOMER",
  SUPPLIER: "SUPPLIER",

  PRODUCTION: "PRODUCTION",
  PREPARATION: "PREPARATION",

  SETTINGS: "SETTINGS",

  OTHER: "OTHER",
});

/* -------------------------------------------------------------------------- */
/*                                 Severity                                   */
/* -------------------------------------------------------------------------- */

export const AUDIT_SEVERITY = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
});

/* -------------------------------------------------------------------------- */
/*                                  Status                                    */
/* -------------------------------------------------------------------------- */

export const AUDIT_STATUS = Object.freeze({
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  WARNING: "WARNING",
});

/* -------------------------------------------------------------------------- */
/*                            Storage Collections                             */
/* -------------------------------------------------------------------------- */

export const AUDIT_COLLECTIONS = Object.freeze({
  ALL: "*",
});

/* -------------------------------------------------------------------------- */
/*                         Ignored Fields (Global)                            */
/* -------------------------------------------------------------------------- */

export const AUDIT_IGNORED_FIELDS = Object.freeze([
  "__v",
  "updatedAt",
  "lastModified",

  "password",
  "passwordHash",
  "salt",

  "otp",
  "otpCode",

  "refreshToken",
  "accessToken",

  "loginToken",

  "resetPasswordToken",
  "resetPasswordExpires",
]);

/* -------------------------------------------------------------------------- */
/*                     Ignored Collections (Optional)                         */
/* -------------------------------------------------------------------------- */

export const AUDIT_IGNORED_COLLECTIONS = Object.freeze([
  "auditlogs",
]);

/* -------------------------------------------------------------------------- */
/*                           Default Configuration                            */
/* -------------------------------------------------------------------------- */

export const AUDIT_DEFAULT_OPTIONS = Object.freeze({
  enabled: true,

  storageMode: AUDIT_STORAGE_MODE.HYBRID,

  saveOldDataOnDelete: true,

  saveNewDataOnCreate: true,

  calculateDiffOnUpdate: true,

  ignoreFields: AUDIT_IGNORED_FIELDS,

  ignoreCollections: AUDIT_IGNORED_COLLECTIONS,

  maxDepth: 10,
});

/* -------------------------------------------------------------------------- */
/*                           Metadata Keys                                    */
/* -------------------------------------------------------------------------- */

export const AUDIT_METADATA_KEYS = Object.freeze({
  REQUEST_ID: "requestId",
  USER_AGENT: "userAgent",
  IP_ADDRESS: "ipAddress",
  DEVICE: "device",
  PLATFORM: "platform",
  BROWSER: "browser",
  OS: "os",
});

/* -------------------------------------------------------------------------- */
/*                           Export Defaults                                  */
/* -------------------------------------------------------------------------- */

export default {
  AUDIT_ACTIONS,
  AUDIT_STATUS,
  AUDIT_SEVERITY,
  AUDIT_STORAGE_MODE,
  AUDIT_CATEGORIES,
  AUDIT_COLLECTIONS,
  AUDIT_IGNORED_FIELDS,
  AUDIT_IGNORED_COLLECTIONS,
  AUDIT_DEFAULT_OPTIONS,
  AUDIT_METADATA_KEYS,
};