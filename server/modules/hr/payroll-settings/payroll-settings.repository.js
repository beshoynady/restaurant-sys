// Repository layer (BACKEND_FOUNDATION.md §4.3): owns ALL database access
// for PayrollSettings.
import BaseRepository from "../../../utils/BaseRepository.js";
import PayrollSettingsModel from "./payroll-settings.model.js";
import AccountModel from "../../accounting/account/account.model.js";

class PayrollSettingsRepository extends BaseRepository {
  constructor() {
    super(PayrollSettingsModel, {
      brandScoped: true,
      branchScoped: false,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "createdBy", "updatedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /** The single non-deleted settings document for a brand, or null. */
  async findForBrand(brandId) {
    return this.model.findOne({ brand: brandId, isDeleted: false }).lean();
  }

  async findAccountForScope(accountId, brandId) {
    return AccountModel.findOne({ _id: accountId, brand: brandId }).select("allowPosting status").lean();
  }
}

export default PayrollSettingsRepository;
