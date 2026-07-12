// Repository layer (BACKEND_FOUNDATION.md §4.3): database access ONLY for DeliveryArea.
// Extracted from delivery-area.service.ts (previously extended BaseService directly).
import BaseRepository from "../../../utils/BaseRepository.js";
import BranchModel from "../branch/branch.model.js";
import DeliveryAreaModel, { type IDeliveryArea } from "./delivery-area.model.js";

class DeliveryAreaRepository extends BaseRepository<IDeliveryArea> {
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
   * available — see delivery-area.service.ts / delivery-area.controller.ts.
   */
  async findBrandIdForBranch(branchId: string): Promise<string> {
    this.validateObjectId(branchId);

    const branch = await BranchModel.findOne({ _id: branchId, isDeleted: false })
      .select("brand")
      .lean();

    if (!branch) {
      // Deliberately no throwError() here: this is a pure query primitive,
      // "not found" is the service's call to make (see class comment on
      // repository/service split in branch.repository.ts).
      return "";
    }

    return String((branch as { brand: unknown }).brand);
  }

  /** Always scoped by brand + branch + _id together — never by area id alone (tenant isolation). */
  async findAreaScoped(areaId: string, brandId: string, branchId: string): Promise<IDeliveryArea | null> {
    this.validateObjectId(areaId);

    return this.model.findOne({
      _id: areaId,
      brand: brandId,
      branch: branchId,
      isDeleted: false,
    });
  }

  async findActiveByBranch(branchId: string, brandId: string) {
    return this.model
      .find({ branch: branchId, brand: brandId, status: "active", isDeleted: false })
      .sort({ priority: -1 })
      .lean();
  }
}

export default DeliveryAreaRepository;
