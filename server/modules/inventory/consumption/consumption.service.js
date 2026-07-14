import ConsumptionModel from "./consumption.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// V6.0 Production Hardening: this module is confirmed CRUD-only — no `beforeCreate`, no
// open/close/post workflow, no TransitionGuard on the schema's own Open/Closed/Posted status, no
// Inventory/Accounting posting despite the schema clearly anticipating one (see
// SUPPLY_CHAIN_PRODUCTION_RELEASE.md's "Not Production Ready" classification for Consumption).
// Fixed here only: two silently-ignored BaseRepository option-name typos (same defect class found
// repeatedly this engagement) — `softDelete`/`searchFields` are not recognized constructor keys
// (the real ones are `enableSoftDelete`/`searchableFields`), so soft-delete was never actually
// enabled and search never actually worked. Not a business-logic fix — the module still has none.
const consumptionService = new AdvancedService(ConsumptionModel, {
  brandScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand", "branch", "Warehouse", "preparationSection", "shift", "openedBy", "closedBy"],
  searchableFields: [],
  defaultSort: { createdAt: -1 },
});

export default consumptionService;
