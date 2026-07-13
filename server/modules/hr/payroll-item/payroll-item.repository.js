// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access
// for PayrollItem. Previously this module had a hand-written service
// (create/findAll/findById/update/delete) incompatible with BaseController
// — same defect class HD-012/HD-019 fixed for prior modules.
import BaseRepository from "../../../utils/BaseRepository.js";
import PayrollItemModel from "./payroll-item.model.js";
import AccountModel from "../../accounting/account/account.model.js";
import CostCenterModel from "../../accounting/cost-center/cost-center.model.js";
import { multilingualSearchableFields } from "../../../utils/multilingualSearch.js";

class PayrollItemRepository extends BaseRepository {
  constructor() {
    super(PayrollItemModel, {
      brandScoped: true,
      branchScoped: false,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "dependsOn", "createdBy", "updatedBy"],
      searchableFields: ["code", ...multilingualSearchableFields("name")],
      defaultSort: { order: 1, createdAt: -1 },
    });
  }

  async findByCode(code, brandId, excludeId = null) {
    const query = { brand: brandId, code, isDeleted: false };
    if (excludeId) query._id = { $ne: excludeId };
    return this.model.findOne(query).lean();
  }

  async findAccountForScope(accountId, brandId) {
    return AccountModel.findOne({ _id: accountId, brand: brandId }).select("allowPosting status").lean();
  }

  async findCostCenterForScope(costCenterId, brandId) {
    return CostCenterModel.findOne({ _id: costCenterId, brand: brandId }).select("isActive").lean();
  }

  async findDependenciesForScope(ids, brandId) {
    return this.model.find({ _id: { $in: ids }, brand: brandId, isDeleted: false }).select("code dependsOn").lean();
  }

  /** All of a brand's active items, id-keyed with their own `dependsOn` list — the graph detectCircularDependency() walks. */
  async findDependencyGraph(brandId) {
    const items = await this.model.find({ brand: brandId, isDeleted: false }).select("code dependsOn").lean();
    return new Map(items.map((item) => [String(item._id), { code: item.code, dependsOn: item.dependsOn.map(String) }]));
  }
}

export default PayrollItemRepository;
