import mongoose from "mongoose";
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

/**
 * PreparationSettings — the ONLY configuration aggregate for the entire Preparation bounded
 * context (PREPARATION_CONFIGURATION_PLATFORM_ENTERPRISE_DESIGN.md §8, approved 2026-07-20).
 *
 * `PreparationTicketSettings` and `PreparationReturnSettings` have been fully removed (their
 * collections are not deleted from MongoDB — any real data is folded forward by
 * `preparation-settings.service.js#migrateLegacySettings()`, which reads the raw collections
 * directly rather than importing the now-deleted Mongoose models — but no code anywhere
 * references those two model/service/controller/router/validation modules any longer; they do
 * not exist in source). The five ticket-policy fields formerly embedded on
 * `PreparationSectionConfig` (`autoAssignChef`, `requireConfirmationBeforeSend`,
 * `allowRejectTickets`, `allowPartialDelivery`, `isDeliveryRelevant`) were removed earlier the
 * same day and are not restored here.
 *
 * Scope is deliberately narrow — only genuine Preparation BUSINESS POLICY, per the approved
 * design's explicit Single-Source-of-Truth boundary. Removed from the original same-day draft of
 * this model (each duplicated or had no real owner — PREPARATION_CONFIGURATION_PLATFORM_
 * ENTERPRISE_DESIGN.md §3/§6/§8): `notifications`/`escalation` (duplicate the already-real
 * `NotificationSettings.preparationSection.newOrder`/`.delayedOrder` — that model is the correct,
 * sole owner of all notification/escalation policy platform-wide); `printing` (duplicates
 * `PrintSettings`, the correct, sole owner of print formatting); `display`/`routing` (hardware/
 * device-routing concerns — the future, not-yet-built Device/Routing Platform's job, never
 * Preparation's); `safety`/`quality`/`shift` (no real business rule or consuming code exists for
 * any of these anywhere in this codebase — correctly left undesigned rather than homed
 * prematurely, matching this platform's own repeated "schema-ahead-of-implementation" lesson);
 * `waste.defaultWasteCategory` (no reader anywhere — `WasteRecord.wasteCategory` is chosen per
 * actual waste event, never defaulted from settings); a redundant top-level `inventoryBehavior`
 * wrapper that duplicated `return.affectInventory` below (same concept, two locations — kept the
 * one that was already part of the real, migrated `PreparationReturnSettings` schema).
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

    /** Kitchen Queue behavior — `sortBy` is read by `preparation-ticket.service.js#getKitchenQueue()`. */
    queue: {
      sortBy: { type: String, enum: ["receivedAt", "expectedReadyAt"], default: "receivedAt" },
    },

    /** SLA — the fixed 3-minute "warning" threshold `_groupTicketsByStation()` used to hardcode. */
    sla: {
      warningThresholdMinutes: { type: Number, default: 3, min: 0 },
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
