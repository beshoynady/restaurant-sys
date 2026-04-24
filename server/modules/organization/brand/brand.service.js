import BrandModel from "./brand.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

class BrandService extends AdvancedService {
  constructor() {
    super(BrandModel, {
      brandScoped: true,
      softDelete: true,
      defaultPopulate: ["createdBy", "updatedBy", "deletedBy"],
      defaultSort: { createdAt: -1 },
    });
  }

  // =========================
  // 🟢 BRAND STATUS CONTROL
  // =========================
  async changeStatus(id, status, userId) {
    return this.update(id, {
      status,
      updatedBy: userId,
    });
  }

  // =========================
  // 🟢 UPDATE LOGO ONLY
  // =========================
  async updateLogo(id, logoUrl, userId) {
    return this.update(id, {
      logo: logoUrl,
      updatedBy: userId,
    });
  }

  // =========================
  // 🟢 UPDATE BRAND SETTINGS (Dashboard settings)
  // =========================
  async updateSettings(id, data, userId) {
    const allowedFields = {
      currency: data.currency,
      timezone: data.timezone,
      countryCode: data.countryCode,
      defaultDashboardLanguage: data.defaultDashboardLanguage,
      dashboardLanguages: data.dashboardLanguages,
    };

    return this.update(id, {
      ...allowedFields,
      updatedBy: userId,
    });
  }

  // =========================
  // 🟢 SETUP PROGRESS FLOW (IMPORTANT)
  // =========================
  async updateSetupStatus(id, step, userId) {
    let status = "draft";

    if (step >= 1) status = "basic";
    if (step >= 3) status = "complete";

    return this.update(id, {
      setupStatus: status,
      updatedBy: userId,
    });
  }

  // =========================
  // 🟢 SEARCH FOR FRONTEND
  // =========================
  async searchBrands(query, userId) {
    return this.findAll({
      filter: {
        $or: [
          { "name.en": { $regex: query, $options: "i" } },
          { "name.ar": { $regex: query, $options: "i" } },
          { legalName: { $regex: query, $options: "i" } },
        ],
      },
      userId,
    });
  }

  // =========================
  // 🟢 DASHBOARD SUMMARY (IMPORTANT FOR FRONT)
  // =========================
  async getSummary(id) {
    const brand = await this.findOne(id);

    return {
      id: brand._id,
      name: brand.name,
      status: brand.status,
      setupStatus: brand.setupStatus,
      currency: brand.currency,
      timezone: brand.timezone,
      branchesLimit: brand.maxBranches,
      logo: brand.logo,
    };
  }

  // =========================
  // 🟢 BRANCH LIMIT CHECK
  // =========================
  async canCreateBranch(id, currentBranchesCount) {
    const brand = await this.findOne(id);
    return currentBranchesCount < brand.maxBranches;
  }
}

export default new BrandService();