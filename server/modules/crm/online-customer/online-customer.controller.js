// controllers/customers/online-customer.controller.js

import BaseController from "../../utils/BaseController.js";
import onlineCustomerService from "../../services/customers/online-customer.service.js";
import asyncHandler from "../../utils/asyncHandler.js";

/**
 * OnlineCustomerController
 */
class OnlineCustomerController extends BaseController {
  constructor() {
    super(onlineCustomerService);
  }

  // =====================================================
  // 🔐 CREATE CUSTOMER (WITH PASSWORD HASH)
  // =====================================================
  create = asyncHandler(async (req, res) => {
    const { brandId } = req.user;

    const data = await this.service.createCustomer({
      ...req.body,
      brand: brandId,
    });

    res.status(201).json({
      success: true,
      data,
    });
  });

  // =====================================================
  // ⭐ ADD POINTS
  // =====================================================
  addPoints = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { points } = req.body;

    const data = await this.service.addPoints(id, points);

    res.json({
      success: true,
      data,
    });
  });

  // =====================================================
  // ⭐ RECALCULATE TIER
  // =====================================================
  recalcTier = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const data = await this.service.recalculateTier(id);

    res.json({
      success: true,
      data,
    });
  });

  // =====================================================
  // 📍 SET DEFAULT ADDRESS
  // =====================================================
  setDefaultAddress = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { addressId } = req.body;

    const data = await this.service.setDefaultAddress(id, addressId);

    res.json({
      success: true,
      data,
    });
  });
}

export default new OnlineCustomerController();