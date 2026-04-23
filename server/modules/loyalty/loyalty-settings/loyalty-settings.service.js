import LoyaltySettingsModel from "./loyalty-settings.model.js";
import AdvancedService from "../../../utils/AdvancedService.js";

class LoyaltySettingsService extends AdvancedService {
  constructor() {
    super(LoyaltySettingsModel, {
      brandScoped: true,
      softDelete: true,
      defaultPopulate: ["brand", "createdBy", "updatedBy"],
      defaultSort: { createdAt: -1 },
    });
  }

  /* =====================================================
     🔹 CREATE OVERRIDE (Prevent duplicate per brand)
  ===================================================== */
  async create(data, options = {}) {
    const existing = await this.model.findOne({ brand: data.brand });

    if (existing) {
      throw new Error("Loyalty settings already exist for this brand");
    }

    return super.create(data, options);
  }

  /* =====================================================
     🔹 GET ACTIVE SETTINGS
  ===================================================== */
  async getActiveSettings(brandId) {
    const settings = await this.model.findOne({
      brand: brandId,
      isDeleted: { $ne: true },
    });

    if (!settings) throw new Error("Settings not found");
    if (!settings.isActive) throw new Error("Loyalty disabled");

    return settings;
  }

  /* =====================================================
     🔹 CALCULATE EARN POINTS
  ===================================================== */
  calculateEarnedPoints(settings, orderAmount) {
    if (!orderAmount || orderAmount <= 0) return 0;

    let points =
      Math.floor(orderAmount / settings.currencyAmount) *
      settings.pointsPerCurrency;

    if (settings.maxPointsPerOrder) {
      points = Math.min(points, settings.maxPointsPerOrder);
    }

    return points;
  }

  /* =====================================================
     🔹 CALCULATE REDEEM VALUE
  ===================================================== */
  calculateRedeemValue(settings, points, orderAmount) {
    if (points < settings.minimumRedeemPoints) {
      throw new Error("Minimum redeem points not reached");
    }

    const maxAllowed =
      (orderAmount * settings.maxRedeemPercentage) / 100;

    const value = points * settings.currencyPerPoint;

    return Math.min(value, maxAllowed);
  }

  /* =====================================================
     🔹 CALCULATE TIER (FIXED ORDER)
  ===================================================== */
  calculateTier(settings, points) {
    const tiers = Object.entries(settings.tiers.toJSON())
      .sort((a, b) => a[1] - b[1]);

    let current = "regular";

    for (const [tier, min] of tiers) {
      if (points >= min) current = tier;
    }

    return current;
  }
}

export default new LoyaltySettingsService();