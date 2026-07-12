// Repository layer (BACKEND_FOUNDATION.md §4.3): database access ONLY for DeliveryArea.
import BaseRepository from "../../../utils/BaseRepository.js";
import BranchModel from "../branch/branch.model.js";
import DeliveryAreaModel from "./delivery-area.model.js";

class DeliveryAreaRepository extends BaseRepository {
  constructor() {
    super(DeliveryAreaModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "createdBy", "updatedBy", "deletedBy"],
      searchableFields: ["name.EN", "name.AR", "code"],
      defaultSort: { priority: -1, createdAt: -1 },
    });
  }

  /**
   * Resolves `brand` from `branch` (DB read against Branch — a sibling
   * module, acceptable here since it's a plain read, not a cross-module
   * write). Needed because the public delivery-area endpoints have no
   * `req.user`, so `branch` (from the URL) is the only tenant signal
   * available — see delivery-area.service.js / delivery-area.controller.js.
   */
  async findBrandIdForBranch(branchId) {
    this.validateObjectId(branchId);

    const branch = await BranchModel.findOne({ _id: branchId, isDeleted: false })
      .select("brand")
      .lean();

    if (!branch) {
      // Deliberately no throwError() here: this is a pure query primitive,
      // "not found" is the service's call to make.
      return "";
    }

    return String(branch.brand);
  }

  /** Always scoped by brand + branch + _id together — never by area id alone (tenant isolation). */
  async findAreaScoped(areaId, brandId, branchId) {
    this.validateObjectId(areaId);

    return this.model.findOne({
      _id: areaId,
      brand: brandId,
      branch: branchId,
      isDeleted: false,
    });
  }

  async findActiveByBranch(branchId, brandId) {
    return this.model
      .find({ branch: branchId, brand: brandId, status: "active", isDeleted: false })
      .sort({ priority: -1 })
      .lean();
  }
}

export default DeliveryAreaRepository;
