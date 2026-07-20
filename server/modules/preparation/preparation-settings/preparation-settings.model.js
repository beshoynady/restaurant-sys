import mongoose from "mongoose";
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

/**
 * PreparationSettings — the single configuration source for the whole Preparation bounded
 * context (PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md, "Fifth Objective" / "Recommended
 * Architecture"). Replaces three previously-uncoordinated, entirely-unread settings surfaces:
 * `PreparationTicketSettings`, `PreparationReturnSettings`, and five ticket-policy fields that
 * used to live directly on `PreparationSectionConfig` (`autoAssignChef`,
 * `requireConfirmationBeforeSend`, `allowRejectTickets`, `allowPartialDelivery`,
 * `isDeliveryRelevant`). Those three collections/fields are NOT deleted — see
 * `preparation-settings.service.js#migrateLegacySettings()` for the backward-compatible,
 * lazy migration path — but this document is the one place new code reads Preparation policy
 * from.
 *
 * Scoped brand/branch only (mirrors `AccountingSettings`/`OrderSettings`/`InventorySettings`'s own
 * convention), not per-`PreparationSectionConfig` — genuine per-station operational facts
 * (capacity, average prep time, station type) stay on `PreparationSectionConfig` itself
 * (PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md's "Seventh Objective" boundary: Settings = policy,
 * Section = operational identity).
 */
const preparationSettingsSchema = new Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null }, // null = brand-wide default

    /** Ticket lifecycle policy — replaces PreparationTicketSettings. */
    ticket: {
      ticketSequence: {
        prefix: { type: String, default: "TCK-" },
        currentNumber: { type: Number, default: 1 },
        lastResetDate: { type: String, default: null }, // YYYY-MM-DD
        resetDaily: { type: Boolean, default: true },
      },
      autoSendToWaiter: { type: Boolean, default: true },
      deliveryPolicy: { type: String, enum: ["IMMEDIATE", "WAIT_ALL"], default: "IMMEDIATE" },
      maxPreparationTime: { type: Number, default: 20, min: 1 }, // minutes
      // Backward-compatibility note (2026-07-20): both default to `true` here, NOT the `false`
      // the old, never-enforced PreparationTicketSettings schema declared — neither was ever
      // actually gated by any code before this settings model existed (confirmed: REJECTED was
      // always a legal transition, ticket items were always editable at any status), so `true`
      // (no new restriction) is the value that actually preserves every existing brand's real
      // behavior. A brand that explicitly configures `false` gets the restriction; one that never
      // touches this settings document does not suddenly lose a capability it always had.
      allowRejectTicket: { type: Boolean, default: true },
      autoMergeTickets: { type: Boolean, default: false },
      allowEditAfterSent: { type: Boolean, default: true },
    },

    /**
     * Kitchen-return / waste-vs-restock policy — replaces PreparationReturnSettings.
     * Backward-compatibility note: all three `allow*` decisions default to `true` here, not the
     * old PreparationReturnSettings schema's `false` for allowReturnToStock/allowResellable —
     * `PreparationReturn.items[].decision` was never actually gated by any enforcement code before
     * this settings model existed (any of the three enum values was always accepted), so `true`
     * preserves real existing behavior for every brand that has never configured this settings
     * document.
     */
    return: {
      allowWaste: { type: Boolean, default: true },
      allowReturnToStock: { type: Boolean, default: true },
      allowResellable: { type: Boolean, default: true },
      // Decision ownership — job-title-based, same convention as SalesReturnSettings.decisionBy
      // (ADR-001 Phase 2 architecture decision), not RBAC-permission-based.
      decisionBy: { type: [ObjectId], ref: "JobTitle", default: [] },
      affectInventory: { type: Boolean, default: true },
      requireReasonForWaste: { type: Boolean, default: true },
      requireReasonForReturn: { type: Boolean, default: true },
      maxReturnMinutesFromPreparation: { type: Number, default: 30, min: 0 },
      requireSupervisorReview: { type: Boolean, default: false },
      ticketImmutableAfterFinalize: { type: Boolean, default: true },
    },

    /** Kitchen Queue / KDS display policy. */
    queue: {
      sortBy: { type: String, enum: ["receivedAt", "expectedReadyAt"], default: "receivedAt" },
    },
    display: {
      refreshIntervalSeconds: { type: Number, default: 15, min: 1 },
    },

    /** Ticket routing policy (documents the existing per-section-split behavior; does not change it). */
    routing: {
      allowMultiSectionSplit: { type: Boolean, default: true },
    },

    /** SLA — the fixed 3-minute "warning" threshold `_groupTicketsByStation()` used to hardcode. */
    sla: {
      warningThresholdMinutes: { type: Number, default: 3, min: 0 },
    },

    /**
     * Notifications / Escalations / Printing / Safety / Quality / Shift — declared configuration
     * surfaces per this domain's architecture review (Objective 1's full list). No dispatch/
     * enforcement mechanism exists anywhere in this bounded context for these yet (verified: no
     * notification, printing, or HACCP-style safety-check code exists in Preparation today) — these
     * fields exist so the single settings document is genuinely complete and future phases have
     * one place to wire behavior into, not because this phase invents new workflows for them.
     */
    notifications: {
      notifyOnReject: { type: Boolean, default: false },
      notifyOnOverdue: { type: Boolean, default: false },
    },
    escalation: {
      escalateAfterMinutes: { type: Number, default: 0, min: 0 },
    },
    printing: {
      autoPrintOnCreate: { type: Boolean, default: false },
    },
    safety: {
      requireHaccpCheck: { type: Boolean, default: false },
    },
    quality: {
      requireQualityRatingOnDiscard: { type: Boolean, default: false },
    },
    shift: {
      requireOpenShiftForOperations: { type: Boolean, default: false },
    },

    /** Inventory-behavior policy shared across Return/Oil (kept generic, not duplicated per feature). */
    inventoryBehavior: {
      affectInventoryOnReturn: { type: Boolean, default: true },
    },
    waste: {
      defaultWasteCategory: {
        type: String,
        enum: [
          "PreparationWaste", "ProductionWaste", "CookingLoss", "YieldLoss", "Spoilage",
          "Expired", "Damaged", "BurnedFood", "Shrinkage", "Theft", "QualityReject",
          "CustomerReturnWaste", null,
        ],
        default: null,
      },
    },

    isActive: { type: Boolean, default: true },
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

/** One document per brand/branch (branch: null = brand-wide default) — same shape as AccountingSettings. */
preparationSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

export default mongoose.model("PreparationSettings", preparationSettingsSchema);
