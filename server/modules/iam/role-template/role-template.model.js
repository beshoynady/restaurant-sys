import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * RoleTemplate
 * ------------
 * DEFAULT_ROLE_ARCHITECTURE.md — a platform-owned, versioned permission blueprint. NOT a `Role`
 * document: a brand never gets one of these auto-created (see that document §1 — auto-creating a
 * dozen roles nobody assigns to anyone just clutters the role list). Instead, an Owner/Administrator
 * "instantiates" a template into a real, brand-scoped `Role` document on demand.
 *
 * Global scope (no `brand` field) — this is a shared catalog every brand reads from, like a
 * product catalog, not tenant data. Deliberately NOT synced to roles already instantiated from it:
 * if this document changes later, every brand's already-created role from this template stays
 * exactly as it was — silently changing a tenant's live security posture because a shared template
 * changed would violate "Owner Controlled" (see DEFAULT_ROLE_ARCHITECTURE.md §2).
 */
const roleTemplateSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: Map, of: String, required: true },
    description: { type: Map, of: String, required: true },
    category: { type: String, required: true },

    // Domain-group -> access-level pairs, expanded into a real `permissions` array only at
    // instantiation time (DEFAULT_ROLE_ARCHITECTURE.md §3 — avoids hand-authoring a ~1,000-entry
    // role x resource matrix that drifts every time RESOURCE_ENUM grows).
    domainGrants: [
      {
        _id: false,
        domain: { type: String, required: true },
        level: { type: String, enum: ["NONE", "READ", "OPERATE", "MANAGE", "FULL"], required: true },
      },
    ],

    defaultScope: { type: String, enum: ["ALL_BRANCHES", "ASSIGNED_BRANCHES"], required: true },

    isSystemTemplate: { type: Boolean, default: true },
    recommendedFor: { type: [String], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("RoleTemplate", roleTemplateSchema);
