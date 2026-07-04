// modules/core/brand-settings/brand-settings.service.js

import BrandSettingsModel from "./brand-settings.model.js";
import throwError from "../../../utils/throwError.js";

class BrandSettingsService {
  /* ================= GET ================= */
  async getByBrand(brandId) {
    return BrandSettingsModel.findOne({ brand: brandId });
  }

  /* ================= CREATE ================= */
  async create(brandId, data) {
    const exists = await this.getByBrand(brandId);
    if (exists) throw throwError("Settings already exist", 409);

    return BrandSettingsModel.create({
      brand: brandId,
      ...data,
    });
  }

  /* ================= UPDATE ================= */
  async update(brandId, data, userId) {
    return BrandSettingsModel.findOneAndUpdate(
      { brand: brandId },
      {
        ...data,
        updatedBy: userId,
      },
      { new: true },
    );
  }

  /* ================= MODULE TOGGLE ================= */
  async toggleModule(brandId, module, enabled) {
    return BrandSettingsModel.findOneAndUpdate(
      { brand: brandId },
      {
        [`modules.${module}.enabled`]: enabled,
      },
      { new: true },
    );
  }

  /* ================= DELETE ================= */
  async softDelete(brandId, userId) {
    return BrandSettingsModel.findOneAndUpdate(
      { brand: brandId },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      },
    );
  }

  async restore(brandId) {
    return BrandSettingsModel.findOneAndUpdate(
      { brand: brandId },
      {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
    );
  }
}

export default new BrandSettingsService();
