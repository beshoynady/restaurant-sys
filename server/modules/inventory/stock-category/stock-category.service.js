import StockCategoryModel from "./stock-category.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// V6.0 Production Hardening: this was a hand-rolled class (create(data)/findAll(filter)/
// findById(id)/update(id,data)/delete(id)) that did not extend BaseRepository and did not match
// BaseController's calling convention (service.create({brandId,branchId,data,createdBy}),
// service.getAll({...}), no getAll at all) — the exact same defect class already found and fixed
// on inventory.service.js. Its router (stock-category.router.js) was never mounted, so this never
// reached production as a live crash; rebuilt on the standard Repository Pattern here so mounting
// it is now safe, matching every sibling module in this domain (stock-item, warehouse, ...).
class StockCategoryService extends AdvancedService {
  constructor() {
    super(StockCategoryModel, {
      brandScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "createdBy", "updatedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }
}

export default new StockCategoryService();
