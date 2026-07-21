import PreparationReturnModel from "./preparation-return.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import preparationSettingsService from "../preparation-settings/preparation-settings.service.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";
import { isAuthorizedByJobTitle } from "../../../utils/authorizeByJobTitle.js";
import PreparationSectionModel from "../preparation-section/preparation-section.model.js";
import RecipeModel from "../../menu/recipe/recipe.model.js";
import inventoryService from "../../inventory/inventory/inventory.service.js";
import warehouseDocumentService from "../../inventory/warehouse-document/warehouse-document.service.js";
import wasteRecordService from "../../inventory/waste-record/waste-record.service.js";

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

  /**
   * ADR-001 Phase 2: the first real consumer of `items[].decision` — before this method, the
   * field was validated (gated against PreparationSettings.return.allow*) but drove zero actual
   * inventory movement (confirmed by this same phase's own architecture review). A dedicated
   * action, not overloaded onto the generic PUT (same reasoning as WasteRecordService.approve()/
   * PaymentService.recordPayment() being dedicated methods): IN_REVIEW -> FINALIZED, then — inside
   * its own transaction, never SalesReturn's — posts each line's disposition: RETURN_TO_STOCK/
   * RESELLABLE -> ReturnIssuance (goods back into stock); WASTE -> WasteRecord{CustomerReturnWaste}
   * (goods written off). Each product's Recipe (Product -> Recipe.ingredients[].stockItem, the
   * exact same bridge recipe-consumption.service.js already uses) determines which StockItems move
   * and by how much — a Product with no active Recipe is honestly skipped, not fabricated a
   * fallback (ENTERPRISE_REFUND_ARCHITECTURE_DESIGN.md §5's own recommended "Option 2").
   */
  async finalize({ id, brand, branch, actorId }) {
    const doc = await this.model.findOne({ _id: id, brand, branch });
    if (!doc) throwError("Preparation return not found.", 404);
    if (doc.status !== "IN_REVIEW") {
      throwError(`Only an IN_REVIEW return can be finalized (current status: ${doc.status}).`, 409);
    }
    if (!doc.items || doc.items.length === 0) {
      throwError("Preparation return has no items.", 400);
    }

    const settings = await preparationSettingsService.resolveForBranch(brand, branch, actorId);
    const decisionBy = settings.return?.decisionBy;
    if (Array.isArray(decisionBy) && decisionBy.length > 0) {
      const authorized = await isAuthorizedByJobTitle(actorId, decisionBy);
      if (!authorized) {
        throwError(
          "The finalizing user's job title is not authorized to finalize preparation returns for this brand/branch (PreparationSettings.return.decisionBy).",
          403,
        );
      }
    }
    // An unconfigured (empty) decisionBy fails OPEN — matches this platform's established
    // convention for unconfigured policy gates (checkModuleEnabled, PreparationSettings' own
    // hardcoded-default fallbacks) rather than locking out every brand that hasn't set this yet.

    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: "IN_REVIEW" },
      { $set: { status: "FINALIZED" } },
      { new: true },
    );
    if (!claimed) {
      throwError("This return was already finalized or cancelled by a concurrent request.", 409);
    }

    const section = await PreparationSectionModel.findById(claimed.preparationSection).select("warehouse").lean();
    const warehouse = section?.warehouse || null;

    return this.withTransaction(async (session) => {
      if (warehouse) {
        const productIds = [...new Set(claimed.items.map((i) => String(i.product)))];
        const recipes = await RecipeModel.find({ product: { $in: productIds }, brand, isActive: true }).session(session).lean();
        const recipeByProduct = Object.fromEntries(recipes.map((r) => [String(r.product), r]));

        for (const item of claimed.items) {
          const recipe = recipeByProduct[String(item.product)];
          if (!recipe?.ingredients?.length) continue;

          if (item.decision === "WASTE") {
            await this._postWaste({ session, brand, branch, warehouse, department: claimed.preparationSection, recipe, item, claimed, actorId });
          } else {
            // RETURN_TO_STOCK / RESELLABLE
            await this._postReturnIssuance({ session, brand, branch, warehouse, recipe, item, claimed, actorId });
          }
        }
      }

      return this.model.findById(claimed._id).session(session);
    });
  }

  /** Restores a returned item's ingredient StockItems into the section's warehouse — the goods
   * physically came back, so their previously-consumed ingredients are credited back. */
  async _postReturnIssuance({ session, brand, branch, warehouse, recipe, item, claimed, actorId }) {
    const docItems = [];
    for (const ingredient of recipe.ingredients) {
      const quantity = ingredient.amount * item.quantity * (1 + (ingredient.wastePercentage || 0) / 100);
      const balance = await inventoryService.findBalance(warehouse, ingredient.stockItem, session);
      docItems.push({ stockItem: ingredient.stockItem, quantity, unitCost: balance?.avgUnitCost || 0, totalCost: 0 });
    }
    if (docItems.length === 0) return;

    const warehouseDocument = await warehouseDocumentService.create({
      brandId: brand, branchId: branch, createdBy: actorId,
      data: {
        branch, documentType: "IN", postingDate: new Date(), transactionType: "ReturnIssuance",
        documentNumber: `WD-PR${claimed.ticketNumber}-${item._id}`,
        destinationWarehouse: warehouse, items: docItems, status: "approved",
      },
      session,
    });

    await warehouseDocumentService.postDocument({ id: warehouseDocument._id, brand, branch, postedBy: actorId, session });
  }

  /**
   * Writes off a returned-and-discarded item's ingredient StockItems. The original sale already
   * deducted these ingredients via recipe consumption — there is no leftover physical quantity to
   * "waste" a second time. This method therefore first RESTORES them (identical to
   * `_postReturnIssuance`) and then immediately writes them back off via the existing, real
   * WasteRecord{CustomerReturnWaste} category — a net-zero physical stock change, but a real,
   * correctly-costed loss entry for reporting/audit (Cost of Customer-Return Waste), matching this
   * platform's "reuse existing mechanisms" discipline (ENTERPRISE_REFUND_ARCHITECTURE_DESIGN.md §5
   * Option 2) rather than inventing a "waste without restoring first" concept this codebase's
   * Inventory Posting Engine has no shape for. All inside the caller's transaction, so a posting
   * failure at either step aborts the whole finalize() attempt.
   */
  async _postWaste({ session, brand, branch, warehouse, department, recipe, item, claimed, actorId }) {
    await this._postReturnIssuance({ session, brand, branch, warehouse, recipe, item, claimed, actorId });

    const docItems = recipe.ingredients.map((ingredient) => ({
      stockItem: ingredient.stockItem,
      quantity: ingredient.amount * item.quantity * (1 + (ingredient.wastePercentage || 0) / 100),
    }));
    if (docItems.length === 0) return;

    const wasteDoc = await wasteRecordService.create({
      brandId: brand, branchId: branch, createdBy: actorId,
      data: {
        branch, wasteDate: new Date(), warehouse, wasteCategory: "CustomerReturnWaste",
        items: docItems, department, responsibleEmployee: claimed.responsibleEmployee || null,
        reasonNotes: item.reason || `Customer return (Preparation Return ${claimed.ticketNumber})`,
      },
      session,
    });

    await wasteRecordService.transition({ id: wasteDoc._id, brand, branch, toStatus: "Submitted", actorId, session });
    await wasteRecordService.approve({ id: wasteDoc._id, brand, branch, actorId, session });
  }
}

export default new PreparationReturnService();
