/**
 * -----------------------------------------------------------------------------
 * Audit Log Utilities
 * -----------------------------------------------------------------------------
 * Shared helper functions used by the Audit module.
 *
 * These helpers are intentionally stateless.
 * -----------------------------------------------------------------------------
 */

import isEqual from "lodash/isEqual.js";
import cloneDeep from "lodash/cloneDeep.js";
import omit from "lodash/omit.js";

import {
  AUDIT_ACTIONS,
  AUDIT_SEVERITY,
  AUDIT_IGNORED_FIELDS,
  AUDIT_IGNORED_COLLECTIONS,
} from "./audit-log.constants.js";

/* -------------------------------------------------------------------------- */
/* Deep Clone                                                                 */
/* -------------------------------------------------------------------------- */

export const deepClone = (value) => cloneDeep(value);

/* -------------------------------------------------------------------------- */
/* Remove Ignored Fields                                                      */
/* -------------------------------------------------------------------------- */

export function removeIgnoredFields(
  object = {},
  ignoredFields = AUDIT_IGNORED_FIELDS
) {
  if (!object || typeof object !== "object") {
    return {};
  }

  return omit(object, ignoredFields);
}

/* -------------------------------------------------------------------------- */
/* Sanitize Data                                                              */
/* -------------------------------------------------------------------------- */

export function sanitizeData(data = {}) {
  return removeIgnoredFields(deepClone(data));
}

/* -------------------------------------------------------------------------- */
/* Flatten Object                                                             */
/* -------------------------------------------------------------------------- */

export function flattenObject(object = {}, prefix = "") {
  let result = {};

  Object.keys(object || {}).forEach((key) => {
    const value = object[key];

    const newKey = prefix ? `${prefix}.${key}` : key;

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  });

  return result;
}

/* -------------------------------------------------------------------------- */
/* Build Changed Fields                                                       */
/* -------------------------------------------------------------------------- */

export function buildChangedFields(oldData = {}, newData = {}) {
  const before = flattenObject(sanitizeData(oldData));
  const after = flattenObject(sanitizeData(newData));

  const changed = {};

  const keys = new Set([
    ...Object.keys(before),
    ...Object.keys(after),
  ]);

  for (const key of keys) {
    if (!isEqual(before[key], after[key])) {
      changed[key] = {
        old: before[key],
        new: after[key],
      };
    }
  }

  return changed;
}

/* -------------------------------------------------------------------------- */
/* Diff Objects                                                               */
/* -------------------------------------------------------------------------- */

export function diffObjects(oldData = {}, newData = {}) {
  return buildChangedFields(oldData, newData);
}

/* -------------------------------------------------------------------------- */
/* Build Audit Document                                                       */
/* -------------------------------------------------------------------------- */

export function buildAuditDocument({
  action,
  module,
  collection,
  oldData = null,
  newData = null,
  metadata = {},
  user = null,
  employee = null,
  brand,
  branch,
  request = {},
}) {
  return {
    brand,
    branch,

    module,
    collection,

    documentId: newData?._id || oldData?._id,

    action,

    oldData,
    newData,

    changedFields: diffObjects(oldData, newData),

    metadata,

    user,
    employee,

    requestId: request.requestId,

    sessionId: request.sessionId,

    ipAddress: request.ipAddress,

    browser: request.browser,

    operatingSystem: request.operatingSystem,

    device: request.device,

    platform: request.platform,

    userAgent: request.userAgent,

    severity: getActionSeverity(action),
  };
}

/* -------------------------------------------------------------------------- */
/* Severity Resolver                                                          */
/* -------------------------------------------------------------------------- */

export function getActionSeverity(action) {
  switch (action) {
    case AUDIT_ACTIONS.DELETE:
    case AUDIT_ACTIONS.REFUND:
      return AUDIT_SEVERITY.HIGH;

    case AUDIT_ACTIONS.APPROVE:
    case AUDIT_ACTIONS.REJECT:
      return AUDIT_SEVERITY.MEDIUM;

    default:
      return AUDIT_SEVERITY.LOW;
  }
}

/* -------------------------------------------------------------------------- */
/* Ignore Collection                                                          */
/* -------------------------------------------------------------------------- */

export function isAuditIgnored(collection) {
  return AUDIT_IGNORED_COLLECTIONS.includes(
    String(collection).toLowerCase()
  );
}

/* -------------------------------------------------------------------------- */
/* Pick Audit Data                                                            */
/* -------------------------------------------------------------------------- */

export function pickAuditData(document = {}) {
  return sanitizeData(document);
}