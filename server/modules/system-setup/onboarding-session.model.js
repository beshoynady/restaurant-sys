import mongoose from "mongoose";
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

/**
 * OnboardingSession
 * -----------------
 * System Setup V2 — the Single Source of Truth for "where is this specific onboarding attempt
 * right now." Replaces the old `Brand.findOne()` "is the platform already initialized" check,
 * which answered the wrong question entirely for a multi-tenant SaaS (see SYSTEM_SETUP_AUDIT.md
 * §0): "does any Brand exist anywhere" is not the same question as "has THIS tenant's onboarding
 * completed" — the old check meant only the very first restaurant to ever sign up could onboard.
 *
 * One document per onboarding attempt. Exists independently of, and before, the `Brand` it will
 * eventually produce — this is what makes the flow resumable across a server restart: a Mongo
 * transaction cannot survive a process crash, but a durably-persisted `state` field can (see
 * INITIAL_PROVISIONING_ARCHITECTURE.md §1).
 */
export const ONBOARDING_STATES = [
  "NOT_STARTED",
  "LICENSE_ACCEPTED",
  "BRAND_DRAFTED",
  "MAIN_BRANCH_CREATED",
  "OWNER_IDENTITY_DECIDED",
  "DEFAULT_ROLES_CREATED",
  "OWNER_ACCOUNT_CREATED",
  "BRAND_FINALIZED",
  "OWNER_EMPLOYEE_PROVISIONED",
  "AUTH_CONFIGURATION_CREATED",
  "OPERATIONAL_DEFAULTS_PROVISIONED",
  "VALIDATED",
  "READY",
  "CANCELLED",
];

export const OWNER_IDENTITY_SCENARIOS = ["OWNER_ONLY", "OWNER_AS_EMPLOYEE", "DECIDE_LATER"];

const onboardingSessionSchema = new Schema(
  {
    // Opaque bearer credential for resuming this specific attempt (ONBOARDING_API_DESIGN.md §5) —
    // never derived from user-supplied data (not email, not brand name), so knowing a prospective
    // owner's email never lets anyone guess or derive their in-progress token.
    token: { type: String, required: true, unique: true, index: true },

    state: { type: String, enum: ONBOARDING_STATES, default: "NOT_STARTED", required: true, index: true },

    // Accumulates validated-but-not-yet-committed wizard input, namespaced by step key
    // (ONBOARDING_API_DESIGN.md §2) — lets the wizard collect input in whatever order is best for
    // the human (owner identity/credentials first, business details after) while the state machine
    // below still commits documents in dependency order regardless of input order.
    draftInput: { type: Schema.Types.Mixed, default: {} },

    licenseAcceptedAt: { type: Date, default: null },

    // `null` must be listed explicitly — Mongoose's enum validator rejects the literal value
    // `null` unless it's in the enum array itself, even though it's this field's own default.
    ownerIdentityScenario: { type: String, enum: [...OWNER_IDENTITY_SCENARIOS, null], default: null },

    // Set incrementally as each state transition commits — never re-created if already set,
    // which is what makes "never create a second Owner / second Main Branch" structural rather
    // than a separately-written guard (INITIAL_PROVISIONING_ARCHITECTURE.md §3).
    brand: { type: ObjectId, ref: "Brand", default: null },
    branch: { type: ObjectId, ref: "Branch", default: null },
    ownerRole: { type: ObjectId, ref: "Role", default: null },
    owner: { type: ObjectId, ref: "UserAccount", default: null },
    employee: { type: ObjectId, ref: "Employee", default: null },

    validationReport: { type: Schema.Types.Mixed, default: null },

    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    lastError: { type: String, default: null },

    // Refreshed on every successful step (ONBOARDING_API_DESIGN.md §3) so an actively-progressing
    // onboarding never expires mid-flow, while an abandoned one doesn't sit around indefinitely.
    // Not a TTL index — an expired-but-partially-committed session's Brand/Branch documents are
    // deliberately NOT auto-deleted (INITIAL_PROVISIONING_ARCHITECTURE.md §6), so the session
    // record itself is left for an operator to review rather than silently vanishing too.
    expiresAt: { type: Date, required: true },

    idempotencyKey: { type: String, default: null },
    createdByIp: { type: String, default: null },
  },
  { timestamps: true },
);

onboardingSessionSchema.index({ state: 1, createdAt: -1 });

export default mongoose.model("OnboardingSession", onboardingSessionSchema);
