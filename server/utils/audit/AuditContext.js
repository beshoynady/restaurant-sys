/**
 * -----------------------------------------------------------------------------
 * Audit Context
 * -----------------------------------------------------------------------------
 * Builds a normalized context object used across the Audit framework.
 *
 * The context contains all information related to the current request,
 * authenticated user, tenant, and transaction.
 *
 * This utility is framework-agnostic and does not depend directly on Express.
 * -----------------------------------------------------------------------------
 */

import crypto from "crypto";

/* -------------------------------------------------------------------------- */
/*                              Generate Request Id                           */
/* -------------------------------------------------------------------------- */

/**
 * Generates a unique request identifier.
 *
 * @returns {string}
 */
export function generateRequestId() {
  return crypto.randomUUID();
}

/* -------------------------------------------------------------------------- */
/*                              Build Audit Context                           */
/* -------------------------------------------------------------------------- */

/**
 * Builds a normalized audit context.
 *
 * @param {Object} options
 * @returns {Object}
 */
export function createAuditContext(options = {}) {
  return {
    /* ---------------------------------------------------------------------- */
    /* Tenant                                                                  */
    /* ---------------------------------------------------------------------- */

    brandId: options.brandId ?? null,
    branchId: options.branchId ?? null,

    /* ---------------------------------------------------------------------- */
    /* User                                                                     */
    /* ---------------------------------------------------------------------- */

    userId: options.userId ?? null,
    employeeId: options.employeeId ?? null,

    /* ---------------------------------------------------------------------- */
    /* Request                                                                  */
    /* ---------------------------------------------------------------------- */

    requestId: options.requestId || generateRequestId(),

    sessionId: options.sessionId ?? null,

    ipAddress: options.ipAddress ?? null,

    userAgent: options.userAgent ?? null,

    browser: options.browser ?? null,

    operatingSystem: options.operatingSystem ?? null,

    device: options.device ?? null,

    platform: options.platform ?? null,

    language: options.language ?? null,

    timezone: options.timezone ?? null,

    /* ---------------------------------------------------------------------- */
    /* Database                                                                 */
    /* ---------------------------------------------------------------------- */

    session: options.session ?? null,

    /* ---------------------------------------------------------------------- */
    /* Metadata                                                                 */
    /* ---------------------------------------------------------------------- */

    metadata: options.metadata ?? {},
  };
}

/* -------------------------------------------------------------------------- */
/*                         Create Context From Express                        */
/* -------------------------------------------------------------------------- */

/**
 * Creates audit context from Express request object.
 *
 * NOTE:
 * This helper assumes your authentication middleware
 * attaches the authenticated user to req.user.
 *
 * @param {import("express").Request} req
 * @returns {Object}
 */
export function createAuditContextFromRequest(req) {
  const user = req?.user || {};

  return createAuditContext({
    brandId:
      user.brand ||
      req.brandId ||
      req.headers["x-brand-id"],

    branchId:
      user.branch ||
      req.branchId ||
      req.headers["x-branch-id"],

    userId:
      user._id ||
      user.id ||
      null,

    employeeId:
      user.employee ||
      null,

    requestId:
      req.requestId ||
      req.headers["x-request-id"],

    sessionId:
      req.sessionID ||
      null,

    ipAddress:
      req.ip ||
      req.socket?.remoteAddress ||
      null,

    userAgent:
      req.headers["user-agent"],

    language:
      req.headers["accept-language"],

    timezone:
      req.headers["x-timezone"],

    metadata: {},
  });
}

/* -------------------------------------------------------------------------- */
/*                              Merge Context                                */
/* -------------------------------------------------------------------------- */

/**
 * Merges two audit contexts.
 *
 * Child values overwrite parent values.
 *
 * @param {Object} baseContext
 * @param {Object} extraContext
 * @returns {Object}
 */
export function mergeAuditContext(
  baseContext = {},
  extraContext = {}
) {
  return {
    ...baseContext,
    ...extraContext,
    metadata: {
      ...(baseContext.metadata || {}),
      ...(extraContext.metadata || {}),
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                               Clone Context                               */
/* -------------------------------------------------------------------------- */

/**
 * Creates a shallow clone of the context.
 *
 * @param {Object} context
 * @returns {Object}
 */
export function cloneAuditContext(context = {}) {
  return {
    ...context,
    metadata: {
      ...(context.metadata || {}),
    },
  };
}

export default {
  createAuditContext,
  createAuditContextFromRequest,
  mergeAuditContext,
  cloneAuditContext,
  generateRequestId,
};