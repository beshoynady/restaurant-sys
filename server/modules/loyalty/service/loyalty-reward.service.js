import LoyaltyRewardModel from "../../models/loyalty/loyalty-reward.model.js";
import AdvancedService from "../../utils/AdvancedService.js";
import customerLoyaltyService from "./customer-loyalty.service.js";

class LoyaltyRewardService extends AdvancedService {
  constructor() {
    super(LoyaltyRewardModel, {
      brandScoped: true,
      softDelete: true,
      defaultPopulate: ["brand", "branch", "product", "createdBy", "updatedBy"],
      defaultSort: { createdAt: -1 },
    });
  }

  /* =====================================================
     🔹 VALIDATE REWARD BEFORE CREATE / UPDATE
  ===================================================== */
  validateReward(data) {
    if (data.rewardType === "product" && !data.product) {
      throw new Error("Product is required for product reward");
    }

    if (data.rewardType === "discount" && !data.discountAmount) {
      throw new Error("Discount amount is required");
    }
  }

  async create(data, options) {
    this.validateReward(data);
    return super.create(data, options);
  }

  async update(id, data, options) {
    this.validateReward(data);
    return super.update(id, data, options);
  }

  /* =====================================================
     🔹 GET ACTIVE REWARDS (FOR FRONTEND)
  ===================================================== */
  async getActiveRewards({ brand, branch }) {
    const now = new Date();

    return this.model.find({
      brand,
      isActive: true,
      isDeleted: { $ne: true },
      ...(branch && { $or: [{ branch }, { branch: null }] }),
      ...(true && {
        $or: [
          { startDate: { $lte: now } },
          { startDate: null },
        ],
      }),
      ...(true && {
        $or: [
          { endDate: { $gte: now } },
          { endDate: null },
        ],
      }),
    });
  }

  /* =====================================================
     🔹 CHECK IF CUSTOMER CAN REDEEM
  ===================================================== */
  async canRedeem({ rewardId, brand, phone }) {
    const reward = await this.model.findById(rewardId);

    if (!reward || reward.isDeleted || !reward.isActive) {
      throw new Error("Reward not available");
    }

    const wallet = await customerLoyaltyService.getByPhone(
      brand,
      phone
    );

    if (!wallet) throw new Error("Wallet not found");

    if (wallet.points < reward.pointsRequired) {
      throw new Error("Not enough points");
    }

    if (
      reward.maxTotalRedemptions &&
      reward.totalRedemptions >= reward.maxTotalRedemptions
    ) {
      throw new Error("Reward limit reached");
    }

    return { reward, wallet };
  }

  /* =====================================================
     🔹 REDEEM REWARD (CORE)
  ===================================================== */
  async redeemReward({
    rewardId,
    brand,
    phone,
    userId,
    orderAmount,
    session,
  }) {
    const { reward, wallet } = await this.canRedeem({
      rewardId,
      brand,
      phone,
    });

    // deduct points
    await customerLoyaltyService.redeemPoints({
      brand,
      phone,
      points: reward.pointsRequired,
      orderAmount,
      userId,
      session,
    });

    reward.totalRedemptions += 1;
    await reward.save({ session });

    return {
      reward,
      remainingPoints: wallet.points - reward.pointsRequired,
    };
  }
}

export default new LoyaltyRewardService();