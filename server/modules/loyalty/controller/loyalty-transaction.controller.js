import BaseController from "../../utils/BaseController.js";
import service from "../../services/loyalty/loyalty-transaction.service.js";

class LoyaltyTransactionController extends BaseController {
  constructor() {
    super(service);
  }

  /* ================= CUSTOMER ================= */

  getMyHistory = async (req, res) => {
    try {
      const { walletId } = req.params;

      const data = await service.getCustomerHistory(walletId);

      res.json({ success: true, data });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  };

  /* ================= SYSTEM ================= */

  earn = async (req, res) => {
    try {
      const result = await service.earn({
        ...req.body,
        userId: req.user.id,
      });

      res.json({ success: true, data: result });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  };

  redeem = async (req, res) => {
    try {
      const result = await service.redeem({
        ...req.body,
        userId: req.user.id,
      });

      res.json({ success: true, data: result });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  };
}

export default new LoyaltyTransactionController();