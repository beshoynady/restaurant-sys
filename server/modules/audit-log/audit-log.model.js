import mongoose from "mongoose";

const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const auditLogSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true, index: true },

    branch: { type: ObjectId, ref: "Branch", default: null },

    user: { type: ObjectId, ref: "UserAccount", default: null, index: true },

    employee: { type: ObjectId, ref: "Employee", default: null },

    requestId: { type: String, default: null, index: true },
    sessionId: { type: String, default: null },

    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },

    event: {
      type: String,
      enum: [
        "request",
        "create",
        "update",
        "delete",
        "restore",
        "bulk-update",
        "bulk-delete",
        "bulk-restore",
      ],
      required: true,
      index: true,
    },

    // e.g. "hr/employees"
    resource: { type: String, default: null, index: true },

    // e.g. "/hr/employees/123"
    path: { type: String, default: null, index: true },

    method: {
      type: String,
      enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      required: true,
    },

    statusCode: { type: Number, default: null, index: true },

    // Optional structured details (diffs, body snippets, errors, etc.)
    metadata: { type: Schema.Types.Mixed, default: {} },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true, versionKey: false },
);

auditLogSchema.index({ brand: 1, createdAt: -1 });
auditLogSchema.index({ brand: 1, event: 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
