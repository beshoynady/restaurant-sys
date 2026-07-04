import BrandModel from "./brand.model.js";
import BaseService from "../../../utils/BaseService.js";
import throwError from "../../../utils/throwError.js";

class BrandService extends BaseService {
  constructor() {
    super(BrandModel, {
      brandScoped: false,
      softDelete: true,
    });
  }

  /* ---------------- SAFE UPDATE ---------------- */
  async updateBrand({ id, data, userId }) {
    if (!id) throw throwError("ID required", 400);

    return this.update({
      id,
      data: { ...data, updatedBy: userId },
    });
  }

  /* ---------------- STATUS ---------------- */
  async changeStatus(id, status, userId) {
    return this.updateBrand({
      id,
      data: { status },
      userId,
    });
  }

  /* ---------------- LOGO ---------------- */
  async updateLogo(id, logo, userId) {
    return this.updateBrand({
      id,
      data: { logo },
      userId,
    });
  }

  /* ---------------- SETTINGS ---------------- */
  async updateSettings(id, data, userId) {
    return this.updateBrand({
      id,
      data,
      userId,
    });
  }

  /* ---------------- SEARCH ---------------- */
  async searchBrands(q) {
    if (!q) return [];

    return this.model.find({
      isDeleted: false,
      $or: [
        { "name.EN": { $regex: q, $options: "i" } },
        { "name.AR": { $regex: q, $options: "i" } },
        { legalName: { $regex: q, $options: "i" } },
      ],
    });
  }

  /* ---------------- SUMMARY ---------------- */
  async getSummary(id) {
    const brand = await this.model.findById(id).lean();
    if (!brand) throw throwError("Brand not found", 404);

    return {
      id: brand._id,
      name: brand.name,
      status: brand.status,
      setupStatus: brand.setupStatus,
      currency: brand.currency,
      logo: brand.logo,
      maxBranches: brand.maxBranches,
    };
  }

  /* ---------------- SETUP STATUS ---------------- */
  async getSetupStatus(id) {
    const brand = await this.model.findById(id);
    if (!brand) throw throwError("Brand not found", 404);

    return {
      step: brand.setupStatus,
      isCompleted: brand.setupStatus === "complete",
    };
  }

  async updateSetupStatus(id, step, userId) {
    let setupStatus = "draft";

    if (step >= 1) setupStatus = "basic";
    if (step >= 3) setupStatus = "complete";

    return this.updateBrand({
      id,
      data: { setupStatus },
      userId,
    });
  }

  /* ---------------- DELETE ---------------- */
  async hardDelete(id) {
    return this.model.findByIdAndDelete(id);
  }

  async softDelete(id, userId) {
    return this.updateBrand({
      id,
      data: {
        isDeleted: true,
        deletedBy: userId,
        deletedAt: new Date(),
      },
      userId,
    });
  }

  async restore(id, userId) {
    return this.updateBrand({
      id,
      data: {
        isDeleted: false,
        deletedBy: null,
        deletedAt: null,
      },
      userId,
    });
  }
}

export default new BrandService();
