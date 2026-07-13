// controllers/customers/online-customer.controller.js

import BaseController from "../../../utils/BaseController.js";
import onlineCustomerService from "./online-customer.service.js";
import asyncHandler from "../../../utils/asyncHandler.js";

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
  // 👤 GET MY OWN PROFILE (customer-authenticated)
  // -----------------------------------------------------
  // Cross-domain final audit finding (HR_DOMAIN_FINAL_AUDIT.md): the
  // previous customer-facing route reused `BaseController.getOne`, which
  // reads `req.user.brandId`/`req.params.id` — but
  // `middlewares/authenticate-customer.js` sets `req.customer`/`req.brandId`
  // directly, never `req.user`, so that call would have thrown on
  // `req.user` being undefined. It also let `:id` come from the URL
  // instead of the authenticated principal — any logged-in customer could
  // read ANY other customer's profile by guessing/iterating ids (IDOR).
  // Fixed by always resolving the profile from the token's own identity,
  // never from a client-supplied id.
  getMyProfile = asyncHandler(async (req, res) => {
    const data = await this.service.findById({
      id: req.customer._id,
      brandId: req.brandId,
    });

    res.json({ success: true, data });
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