import CustomerLoyaltyModel from "../../models/loyalty/customer-loyalty.model.js";
import AdvancedService from "../../utils/AdvancedService.js";
import loyaltySettingsService from "./loyalty-settings.service.js";

class CustomerLoyaltyService extends AdvancedService {
  constructor() {
    super(CustomerLoyaltyModel, {
      brandScoped: true,
      softDelete: true,
      defaultPopulate: ["brand", "createdBy", "updatedBy"],
      defaultSort: { createdAt: -1 },
    });
  }

  /* =====================================================
     🔹 GET OR CREATE WALLET
  ===================================================== */
  async getOrCreateWallet({ brand, phone, userId, session }) {
    let wallet = await this.model.findOne({ brand, phone });

    if (!wallet) {
      const created = await this.model.create(
        [
          {
            brand,
            phone,
            createdBy: userId,
          },
        ],
        { session }
      );

      wallet = created[0];
    }

    return wallet;
  }

  /* =====================================================
     🔹 GET WALLET BY PHONE
  ===================================================== */
  async getByPhone(brand, phone) {
    return this.model.findOne({
      brand,
      phone,
      isDeleted: { $ne: true },
    });
  }

  /* =====================================================
     🔹 UPDATE TIER (UP ONLY)
     Tier based on totalEarned (NOT current points)
  ===================================================== */
  async updateTier({ wallet, settings, session }) {
    const newTier =
      loyaltySettingsService.calculateTier(
        settings,
        wallet.totalEarned // ✅ IMPORTANT
      );

    if (newTier !== wallet.tier) {
      wallet.tier = newTier;
      wallet.tierUpdatedAt = new Date();
      await wallet.save({ session });
    }

    return wallet;
  }

  /* =====================================================
     🔹 EARN POINTS
  ===================================================== */
  async earnPoints({ brand, phone, orderAmount, userId, session }) {
    const settings =
      await loyaltySettingsService.getActiveSettings(brand);

    const earnedPoints =
      loyaltySettingsService.calculateEarnedPoints(
        settings,
        orderAmount
      );

    if (!earnedPoints) return null;

    const wallet = await this.getOrCreateWallet({
      brand,
      phone,
      userId,
      session,
    });

    wallet.points += earnedPoints;
    wallet.totalEarned += earnedPoints;
    wallet.updatedBy = userId;

    await wallet.save({ session });

    // 🔥 Tier update (based on totalEarned)
    await this.updateTier({ wallet, settings, session });

    return wallet;
  }

  /* =====================================================
     🔹 REDEEM POINTS
  ===================================================== */
  async redeemPoints({
    brand,
    phone,
    points,
    orderAmount,
    userId,
    session,
  }) {
    const settings =
      await loyaltySettingsService.getActiveSettings(brand);

    const wallet = await this.getOrCreateWallet({
      brand,
      phone,
      userId,
      session,
    });

    if (wallet.points < points) {
      throw new Error("Insufficient points");
    }

    // validate redeem rules
    loyaltySettingsService.calculateRedeemValue(
      settings,
      points,
      orderAmount
    );

    wallet.points -= points;
    wallet.totalRedeemed += points;
    wallet.updatedBy = userId;

    await wallet.save({ session });

    // 🔥 Tier does NOT decrease (still call for consistency)
    await this.updateTier({ wallet, settings, session });

    return wallet;
  }

  /* =====================================================
     🔹 ADMIN ADJUSTMENT (Manual)
  ===================================================== */
  async adjustPoints({ brand, phone, points, userId, session }) {
    const settings =
      await loyaltySettingsService.getActiveSettings(brand);

    const wallet = await this.getOrCreateWallet({
      brand,
      phone,
      userId,
      session,
    });

    wallet.points += points;

    if (points > 0) wallet.totalEarned += points;
    if (points < 0) wallet.totalRedeemed += Math.abs(points);

    wallet.updatedBy = userId;

    if (wallet.points < 0) wallet.points = 0;

    await wallet.save({ session });

    await this.updateTier({ wallet, settings, session });

    return wallet;
  }
}

export default new CustomerLoyaltyService();