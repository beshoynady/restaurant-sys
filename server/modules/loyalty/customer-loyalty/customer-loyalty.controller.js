import BaseController from "../../../utils/BaseController.js";
import service from "./customer-loyalty.service.js";

class CustomerLoyaltyController extends BaseController {
  constructor() {
    super(service);
  }

  /* ================= CUSTOMER ================= */

  getMyWallet = async (req, res) => {
    try {
      const { phone } = req.user;
      const { brandId } = req.params;

      const wallet = await service.getByPhone(brandId, phone);

      res.json({ success: true, data: wallet });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  };

  /* ================= SYSTEM ================= */

  earn = async (req, res) => {
    try {
      const { brand, phone, orderAmount } = req.body;

      const wallet = await service.earnPoints({
        brand,
        phone,
        orderAmount,
        userId: req.user.id,
      });

      res.json({ success: true, data: wallet });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  };

  redeem = async (req, res) => {
    try {
      const { brand, phone, points, orderAmount } = req.body;

      const wallet = await service.redeemPoints({
        brand,
        phone,
        points,
        orderAmount,
        userId: req.user.id,
      });

      res.json({ success: true, data: wallet });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  };

  /* ================= ADMIN ================= */

  adjust = async (req, res) => {
    try {
      const { brand, phone, points } = req.body;

      const wallet = await service.adjustPoints({
        brand,
        phone,
        points,
        userId: req.user.id,
      });

      res.json({ success: true, data: wallet });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  };
}

export default new CustomerLoyaltyController();