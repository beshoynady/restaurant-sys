import BaseController from "../../utils/BaseController.js";
import service from "../../services/loyalty/loyalty-reward.service.js";

class LoyaltyRewardController extends BaseController {
  constructor() {
    super(service);
  }

  /* ================= CUSTOMER ================= */

  getActive = async (req, res) => {
    try {
      const { brandId, branchId } = req.query;

      const rewards = await service.getActiveRewards({
        brand: brandId,
        branch: branchId,
      });

      res.json({ success: true, data: rewards });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  };

  /* ================= SYSTEM ================= */

  redeem = async (req, res) => {
    try {
      const { rewardId, brand, phone, orderAmount } = req.body;

      const result = await service.redeemReward({
        rewardId,
        brand,
        phone,
        orderAmount,
        userId: req.user.id,
      });

      res.json({ success: true, data: result });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  };
}

export default new LoyaltyRewardController();