import BaseController from "../BaseController.js";
import loyaltyRewardService from "../../services/loyalty/loyalty-reward.service.js";

class LoyaltyRewardController extends BaseController {
  constructor() {
    super(loyaltyRewardService);
  }
}

export default new LoyaltyRewardController();
