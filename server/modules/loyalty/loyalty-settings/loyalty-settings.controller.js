import BaseController from "../../../utils/BaseController.js";
import loyaltySettingsService from "./loyalty-settings.service.js";

class LoyaltySettingsController extends BaseController {
  constructor() {
    super(loyaltySettingsService);
  }

  /* ================= ADMIN ================= */

  getActiveSettings = async (req, res) => {
    try {
      const settings =
        await loyaltySettingsService.getActiveSettings(req.params.brandId);

      res.json({ success: true, data: settings });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  };

  /* ================= SYSTEM ================= */

  calculatePoints = async (req, res) => {
    try {
      const { brandId, orderAmount } = req.body;

      const settings =
        await loyaltySettingsService.getActiveSettings(brandId);

      const points =
        loyaltySettingsService.calculateEarnedPoints(
          settings,
          orderAmount
        );

      res.json({ success: true, data: { points } });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  };

  calculateTier = async (req, res) => {
    try {
      const { brandId, points } = req.body;

      const settings =
        await loyaltySettingsService.getActiveSettings(brandId);

      const tier =
        loyaltySettingsService.calculateTier(settings, points);

      res.json({ success: true, data: { tier } });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  };

  calculateRedeem = async (req, res) => {
    try {
      const { brandId, points, orderAmount } = req.body;

      const settings =
        await loyaltySettingsService.getActiveSettings(brandId);

      const value =
        loyaltySettingsService.calculateRedeemValue(
          settings,
          points,
          orderAmount
        );

      res.json({ success: true, data: { value } });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  };
}

export default new LoyaltySettingsController();