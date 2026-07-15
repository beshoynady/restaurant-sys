import AccountBalanceModel from "./account-balance.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for account-balance model
const accountBalanceService = new AdvancedService(AccountBalanceModel, {
  brandScoped: true,
  // PLATFORM_FINAL_AUDIT.md PA-01, corrected: AccountBalance is a derived,
  // system-computed period snapshot (recomputed from JournalLine), not a
  // user-managed record — it has no delete semantics of its own. The old
  // `softDelete: true` here was a silently-ignored typo (BaseRepository only
  // recognizes `enableSoftDelete`, which defaults to true) — meaning the
  // read-filter was ALWAYS active despite this model never having an
  // isDeleted field, which was the actual cause of the original PA-01
  // empty-reads bug. Fixed correctly by disabling it explicitly.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","period","account"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default accountBalanceService;
