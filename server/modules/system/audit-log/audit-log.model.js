import mongoose from "mongoose";

import {
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
  AUDIT_STATUS,
} from "./audit-log.constants.js";

const { Schema } = mongoose;
const { ObjectId, Mixed } = Schema.Types;

/**
 * --------------------------------------------------------------------------
 * Audit Log Schema
 * --------------------------------------------------------------------------
 * Stores all critical system activities.
 *
 * This model is intentionally generic so it can be reused by every module
 * inside the system without any modification.
 * --------------------------------------------------------------------------
 */

const auditLogSchema = new Schema(
  {
    /* ------------------------------------------------------------------ */
    /* Multi Tenant                                                       */
    /* ------------------------------------------------------------------ */

    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },

    branch: {
      type: ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    /* ------------------------------------------------------------------ */
    /* Module Information                                                 */
    /* ------------------------------------------------------------------ */

    module: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    collection: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    documentId: {
      type: ObjectId,
      index: true,
    },

    /* ------------------------------------------------------------------ */
    /* Action                                                             */
    /* ------------------------------------------------------------------ */

    action: {
      type: String,
      required: true,
      enum: Object.values(AUDIT_ACTIONS),
      index: true,
    },

    category: {
      type: String,
      enum: Object.values(AUDIT_CATEGORIES),
      default: AUDIT_CATEGORIES.OTHER,
      index: true,
    },

    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "WARNING"],
      default: AUDIT_STATUS.SUCCESS,
      index: true,
    },

    /* ------------------------------------------------------------------ */
    /* Audit Data                                                         */
    /* ------------------------------------------------------------------ */

    oldData: {
      type: Mixed,
      default: null,
      select: false,
    },

    newData: {
      type: Mixed,
      default: null,
      select: false,
    },

    changedFields: {
      type: Mixed,
      default: {},
    },

    metadata: {
      type: Mixed,
      default: {},
    },

    /* ------------------------------------------------------------------ */
    /* Request Information                                                */
    /* ------------------------------------------------------------------ */

    requestId: {
      type: String,
      index: true,
    },

    sessionId: {
      type: String,
      default: null,
      index: true,
    },

    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
      select: false,
    },

    browser: {
      type: String,
      default: null,
    },

    operatingSystem: {
      type: String,
      default: null,
    },

    device: {
      type: String,
      default: null,
    },

    platform: {
      type: String,
      default: null,
    },

    /* ------------------------------------------------------------------ */
    /* Notes                                                              */
    /* ------------------------------------------------------------------ */

    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    tags: {
      type: [String],
      default: [],
      index: true,
    },

    /* ------------------------------------------------------------------ */
    /* User Information                                                   */
    /* ------------------------------------------------------------------ */

    user: {
      type: ObjectId,
      ref: "UserAccount",
      default: null,
      index: true,
    },

    /* ------------------------------------------------------------------ */
    /* Soft Delete                                                        */
    /* ------------------------------------------------------------------ */

    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: ObjectId,
      ref: "UserAccount",
      default: null,
    },
  },
  {
    timestamps: true,
    minimize: false,
    versionKey: false,
  },
);

/* -------------------------------------------------------------------------- */
/* Compound Indexes                                                           */
/* -------------------------------------------------------------------------- */

auditLogSchema.index({
  brand: 1,
  createdAt: -1,
});

auditLogSchema.index({
  brand: 1,
  module: 1,
  createdAt: -1,
});

auditLogSchema.index({
  brand: 1,
  collection: 1,
  createdAt: -1,
});

auditLogSchema.index({
  brand: 1,
  documentId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  brand: 1,
  user: 1,
  createdAt: -1,
});

auditLogSchema.index({
  brand: 1,
  action: 1,
  createdAt: -1,
});

auditLogSchema.index({
  requestId: 1,
});

/* -------------------------------------------------------------------------- */
/* Export                                                                     */
/* -------------------------------------------------------------------------- */

export default mongoose.model("AuditLog", auditLogSchema);
