import AssetModel from "./asset.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

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
      lockedUpdateFields: ["accumulatedDepreciation", "bookValue"],
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
}

export default new AssetService();
