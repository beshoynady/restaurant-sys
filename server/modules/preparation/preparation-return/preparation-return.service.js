import PreparationReturnModel from "./preparation-return.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import preparationSettingsService from "../preparation-settings/preparation-settings.service.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";

// PLATFORM_FINAL_AUDIT.md PA-07: same missing status-transition guard as
// preparation-ticket.service.js. PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md "Eighth Objective"/
// "Recommended Architecture" #3: now built on the platform's shared createTransitionGuard()
// utility instead of a hand-rolled inline map — same states/transitions as before. One observable,
// intentional side effect: an invalid transition now responds 409 (TransitionGuard's own
// convention, matching waste-record/purchase-return) instead of this file's previous
// ad hoc 400 — standardizing to the platform norm, not a new rule.
const statusGuard = createTransitionGuard({
  PENDING: ["IN_REVIEW", "CANCELLED"],
  IN_REVIEW: ["FINALIZED", "CANCELLED"],
  FINALIZED: [],
  CANCELLED: [],
});

// Decisions this domain's `items[].decision` enum actually has (mirrors preparation-return.model.js).
const DECISION_ALLOW_KEY = {
  WASTE: "allowWaste",
  RETURN_TO_STOCK: "allowReturnToStock",
  RESELLABLE: "allowResellable",
};
const DECISION_REQUIRE_REASON_KEY = {
  WASTE: "requireReasonForWaste",
  RETURN_TO_STOCK: "requireReasonForReturn",
};

class PreparationReturnService extends AdvancedService {
  constructor() {
    super(PreparationReturnModel, {
      brandScoped: true,
      // PLATFORM_FINAL_AUDIT.md PA-07, corrected: transactional record with
      // its own status lifecycle (guarded in update() below) — soft-delete
      // does not apply.
      enableSoftDelete: false,
      defaultPopulate: ["brand","branch","returnInvoice","preparationSection","responsibleEmployee","waiter","createdBy","updatedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md "Fifth Objective"/"Recommended Architecture":
   * PreparationReturn now consumes the unified PreparationSettings document instead of the
   * (unread) per-section PreparationReturnSettings it never actually read before. Deliberately
   * scoped to VALIDATION only — no inventory/waste posting is added here (that remains
   * ADR-001 Phase 2's job, not this pass's, per this task's explicit instruction not to touch
   * refund/inventory-posting logic).
   */
  async beforeCreate(data) {
    const settings = await preparationSettingsService.resolveForBranch(data.brand, data.branch, data.createdBy);
    this._validateItemDecisions(data.items, settings);
    this._validateReturnWindow(data.receivedAt, settings);
    return data;
  }

  async update(opts) {
    const { id, data } = opts;

    const current = await this.model.findById(id).select("status brand branch items").lean();
    if (!current) {
      throwError("Resource not found", 404);
    }

    if (data?.items !== undefined || data?.status) {
      const settings = await preparationSettingsService.resolveForBranch(current.brand, current.branch, opts.updatedBy);

      if (data.items !== undefined) {
        if (current.status === "FINALIZED" && settings.return?.ticketImmutableAfterFinalize !== false) {
          throwError(
            "This preparation return has already been finalized and can no longer be edited (PreparationSettings.return.ticketImmutableAfterFinalize).",
            409,
          );
        }
        this._validateItemDecisions(data.items, settings);
      }

      if (data.status && data.status !== current.status) {
        statusGuard.assertValid(current.status, data.status);
      }
    }

    return super.update(opts);
  }

  /** Gates each line's `decision` against PreparationSettings.return.allow*, and enforces the
   * matching require-reason toggle — both directly extending the dormant settings' own, obvious,
   * already-named intent, not new business rules. */
  _validateItemDecisions(items, settings) {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      const allowKey = DECISION_ALLOW_KEY[item.decision];
      if (allowKey && settings.return?.[allowKey] === false) {
        throwError(`Decision "${item.decision}" is disabled for this brand/branch (PreparationSettings.return.${allowKey}).`, 403);
      }
      const requireReasonKey = DECISION_REQUIRE_REASON_KEY[item.decision];
      if (requireReasonKey && settings.return?.[requireReasonKey] !== false && !item.reason?.trim()) {
        throwError(`A reason is required for a "${item.decision}" decision (PreparationSettings.return.${requireReasonKey}).`, 400);
      }
    }
  }

  /** `maxReturnMinutesFromPreparation` — how long after the item was received a return may still
   * be raised. `0` means no limit (disabled), matching this codebase's convention for optional
   * numeric limits elsewhere (e.g. Product availability windows). */
  _validateReturnWindow(receivedAt, settings) {
    const limitMinutes = settings.return?.maxReturnMinutesFromPreparation;
    if (!receivedAt || !limitMinutes) return;
    const elapsedMinutes = (Date.now() - new Date(receivedAt).getTime()) / 60000;
    if (elapsedMinutes > limitMinutes) {
      throwError(
        `This return is being raised ${Math.round(elapsedMinutes)} minutes after receipt, exceeding the allowed ${limitMinutes}-minute window (PreparationSettings.return.maxReturnMinutesFromPreparation).`,
        409,
      );
    }
  }
}

export default new PreparationReturnService();
