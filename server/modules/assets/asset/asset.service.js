import AssetModel from "./asset.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";

// Disposed/Sold are terminal and only reachable via asset-disposal.service.js's scrapAsset()/
// sellAsset() — see this class's own lockedUpdateFields comment for why. This guard covers only
// the legitimate non-terminal moves a plain transition() call may make.
const transitionGuard = createTransitionGuard({
  Draft: ["Active"],
  Active: ["Suspended"],
  Suspended: ["Active"],
  Disposed: [],
  Sold: [],
});

class AssetService extends AdvancedService {
  constructor() {
    super(AssetModel, {
      brandScoped: true,
      // PLATFORM_FINAL_AUDIT.md PA-02, corrected: Asset already has its own
      // full lifecycle status (Draft/Active/Suspended/Disposed/Sold) — that IS
      // the "proper business lifecycle" for removing an asset from active use;
      // soft-delete would be redundant with, and could conflict with, that
      // status field. `softDelete: true` was a silently-ignored typo anyway
      // (see account-balance.service.js); disabled explicitly.
      enableSoftDelete: false,
      defaultPopulate: ["brand","branch","category","supplier","createdBy","updatedBy"],
      searchableFields: [], // specify searchable fields if needed
      defaultSort: { createdAt: -1 },
      // The model's own comment block is explicit: "these fields are cached values ONLY. The source
      // of truth is AssetDepreciation entries" — locked against the generic PUT so only the
      // depreciation engine (asset-depreciation.service.js#_postAccounting) can update them post-
      // creation. `lockedUpdateFields` only guards `update()`, not `create()` — `beforeCreate` below
      // closes the remaining gap (a client could otherwise set an arbitrary starting book value).
      //
      // `status` locked here too (Phase 6 — Asset Disposal): previously a plain `PUT` could set
      // `status: "Disposed"` directly, completely bypassing `asset-disposal.service.js` — no
      // AssetDisposal audit record, no gain/loss computation, no GL posting. The exact "generic PUT
      // bypasses business rules" defect class already fixed on Order/Invoice/CashierShift/
      // DailyExpense earlier this session. Non-terminal moves (Draft->Active, Active<->Suspended)
      // go through the new transition() method below instead of generic PUT.
      lockedUpdateFields: ["accumulatedDepreciation", "bookValue", "status"],
    });
  }

  /**
   * `accumulatedDepreciation`/`bookValue` are derived fields — a freshly capitalized asset has
   * depreciated nothing yet and its book value equals its purchase cost, regardless of whatever a
   * client's create payload happens to contain for these two fields.
   */
  async beforeCreate(data) {
    return { ...data, accumulatedDepreciation: 0, bookValue: data.purchaseCost };
  }

  /** Non-terminal status moves only — Disposed/Sold are reachable exclusively via asset-disposal.service.js. */
  async transition({ id, brand, branch, toStatus, actorId }) {
    const asset = await this.model.findOne({ _id: id, brand, branch });
    if (!asset) throwError("Asset not found.", 404);
    transitionGuard.assertValid(asset.status, toStatus);

    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: asset.status },
      { $set: { status: toStatus, updatedBy: actorId } },
      { new: true },
    );
    if (!claimed) throwError("This asset was already changed by a concurrent request.", 409);
    return claimed;
  }
}

export default new AssetService();
