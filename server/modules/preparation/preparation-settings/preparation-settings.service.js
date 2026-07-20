import PreparationSettingsModel from "./preparation-settings.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import PreparationTicketSettingsModel from "./preparation-ticket-settings.model.js";
import PreparationReturnSettingsModel from "./preparation-return-settings.model.js";

// Hardcoded fallback — identical values to the schema's own defaults, used only when no
// PreparationSettings document AND no legacy document exists to migrate from (a brand nobody has
// ever configured anything for). Kept explicit (not just "new Model().toObject()") so this method
// never accidentally depends on Mongoose casting/default-application behavior for a document that
// is deliberately never constructed.
const HARDCODED_DEFAULTS = {
  ticket: {
    ticketSequence: { prefix: "TCK-", currentNumber: 1, lastResetDate: null, resetDaily: true },
    autoSendToWaiter: true,
    deliveryPolicy: "IMMEDIATE",
    maxPreparationTime: 20,
    // See preparation-settings.model.js's comment on these two fields — `true` preserves actual
    // pre-existing behavior (both were always unrestricted; neither field was ever enforced).
    allowRejectTicket: true,
    autoMergeTickets: false,
    allowEditAfterSent: true,
  },
  return: {
    // See preparation-settings.model.js's comment — `true` for all three preserves actual
    // pre-existing behavior (decision was never gated before this settings model existed).
    allowWaste: true,
    allowReturnToStock: true,
    allowResellable: true,
    decisionBy: [],
    affectInventory: true,
    requireReasonForWaste: true,
    requireReasonForReturn: true,
    maxReturnMinutesFromPreparation: 30,
    requireSupervisorReview: false,
    ticketImmutableAfterFinalize: true,
  },
  queue: { sortBy: "receivedAt" },
  display: { refreshIntervalSeconds: 15 },
  routing: { allowMultiSectionSplit: true },
  sla: { warningThresholdMinutes: 3 },
  notifications: { notifyOnReject: false, notifyOnOverdue: false },
  escalation: { escalateAfterMinutes: 0 },
  printing: { autoPrintOnCreate: false },
  safety: { requireHaccpCheck: false },
  quality: { requireQualityRatingOnDiscard: false },
  shift: { requireOpenShiftForOperations: false },
  inventoryBehavior: { affectInventoryOnReturn: true },
  waste: { defaultWasteCategory: null },
};

class PreparationSettingsService extends AdvancedService {
  constructor() {
    super(PreparationSettingsModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "return.decisionBy", "createdBy", "updatedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md's "Backward compatibility / migration" requirement:
   * the two legacy settings collections (`PreparationTicketSettings`, `PreparationReturnSettings`)
   * are never deleted or written to — this reads them once, lazily, the first time this brand/
   * branch's PreparationSettings is resolved and none exists yet, and folds whatever legacy values
   * exist into the new unified shape. Legacy `PreparationReturnSettings` docs scoped to a specific
   * `preparationSection` are intentionally NOT migrated (the unified model has no per-section
   * scope, matching PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md's "Settings = policy, Section =
   * operational identity" boundary) — only the brand-wide (`preparationSection: null`) legacy
   * return-settings document is a valid migration source.
   */
  async migrateLegacySettings({ brandId, branchId, actorId }) {
    const [legacyTicket, legacyReturn] = await Promise.all([
      PreparationTicketSettingsModel.findOne({ brand: brandId, branch: branchId, isDeleted: { $ne: true } }).lean(),
      PreparationReturnSettingsModel.findOne({ brand: brandId, branch: branchId, preparationSection: null, isDeleted: { $ne: true } }).lean(),
    ]);

    if (!legacyTicket && !legacyReturn) return null;

    const migrated = {
      ticket: legacyTicket
        ? {
            ticketSequence: legacyTicket.ticketSequence,
            autoSendToWaiter: legacyTicket.autoSendToWaiter,
            deliveryPolicy: legacyTicket.deliveryPolicy,
            maxPreparationTime: legacyTicket.maxPreparationTime,
            allowRejectTicket: legacyTicket.allowRejectTicket,
            autoMergeTickets: legacyTicket.autoMergeTickets,
            allowEditAfterSent: legacyTicket.allowEditAfterSent,
          }
        : HARDCODED_DEFAULTS.ticket,
      return: legacyReturn
        ? {
            allowWaste: legacyReturn.allowWaste,
            allowReturnToStock: legacyReturn.allowReturnToStock,
            allowResellable: legacyReturn.allowResellable,
            decisionBy: legacyReturn.decisionBy,
            affectInventory: legacyReturn.affectInventory,
            requireReasonForWaste: legacyReturn.requireReasonForWaste,
            requireReasonForReturn: legacyReturn.requireReasonForReturn,
            maxReturnMinutesFromPreparation: legacyReturn.maxReturnMinutesFromPreparation,
            requireSupervisorReview: legacyReturn.requireSupervisorReview,
            ticketImmutableAfterFinalize: legacyReturn.ticketImmutableAfterFinalize,
          }
        : HARDCODED_DEFAULTS.return,
    };

    if (!actorId) {
      // No authenticated actor available at this call site (e.g. a system/background read) — return
      // the migrated values without persisting. `createdBy` is a required audit field on every
      // settings document in this codebase; a future call that does have an actor will persist this
      // same data the next time resolveForBranch() runs. Never loses data, never fabricates an actor.
      return { brand: brandId, branch: branchId, ...HARDCODED_DEFAULTS, ...migrated };
    }

    const upserted = await this.model.findOneAndUpdate(
      { brand: brandId, branch: branchId },
      { $setOnInsert: { brand: brandId, branch: branchId, createdBy: actorId, ...migrated } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return upserted.toObject ? upserted.toObject() : upserted;
  }

  /**
   * The one read path every Preparation service should use. Branch-specific settings win if
   * present, otherwise the brand-wide (`branch: null`) document, otherwise a lazy migration from
   * the legacy collections, otherwise hardcoded, schema-matching defaults — never throws, mirrors
   * `inventorySettingsService.resolveForPosting()`'s own established fallback shape exactly (a
   * missing Preparation policy document must not block ticket/return operations).
   */
  async resolveForBranch(brandId, branchId = null, actorId = null) {
    const branchSpecific = branchId
      ? await this.model.findOne({ brand: brandId, branch: branchId, isDeleted: { $ne: true } }).lean()
      : null;

    const resolved =
      branchSpecific ??
      (await this.model.findOne({ brand: brandId, branch: null, isDeleted: { $ne: true } }).lean());

    if (resolved) return resolved;

    const migrated = await this.migrateLegacySettings({ brandId, branchId: branchId ?? null, actorId });
    if (migrated) return migrated;

    return { brand: brandId, branch: branchId ?? null, ...HARDCODED_DEFAULTS };
  }
}

export default new PreparationSettingsService();
