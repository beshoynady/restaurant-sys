// controllers/core/delivery-area.controller.js

import BaseController from "../../utils/BaseController.js";
import deliveryAreaService from "./delivery-area.service.js";
import asyncHandler from "../../utils/asyncHandler.js";

/**
 * DeliveryAreaController
 */
class DeliveryAreaController extends BaseController {
  constructor() {
    super(deliveryAreaService);
  }

  // =====================================================
  // 🔹 GET ACTIVE AREAS
  // =====================================================
  getActiveAreasByBranch = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { brandId } = req.user || {};

    const data = await this.service.getActiveAreasByBranch({
      branchId,
      brandId,
    });

    res.json({ success: true, data });
  });

  // =====================================================
  // 🔹 DELIVERY SUMMARY
  // =====================================================
  getDeliverySummary = asyncHandler(async (req, res) => {
    const { areaId } = req.params;
    const { brandId } = req.user || {};
    const { orderAmount = 0 } = req.query;

    const data = await this.service.getDeliverySummary({
      areaId,
      brandId,
      orderAmount: Number(orderAmount),
    });

    res.json({ success: true, data });
  });

  // =====================================================
  // 🔹 CALCULATE DELIVERY FEE
  // =====================================================
  calculateDeliveryFee = asyncHandler(async (req, res) => {
    const { areaId } = req.params;
    const { brandId } = req.user || {};
    const { orderAmount = 0 } = req.query;

    const fee = await this.service.calculateDeliveryFee({
      areaId,
      brandId,
      orderAmount: Number(orderAmount),
    });

    res.json({ success: true, deliveryFee: fee });
  });

  // =====================================================
  // 🔹 VALIDATE ORDER
  // =====================================================
  validateOrder = asyncHandler(async (req, res) => {
    const { areaId } = req.params;
    const { brandId } = req.user || {};
    const { orderAmount = 0, paymentMethod } = req.body;

    await this.service.validateOrder({
      areaId,
      brandId,
      orderAmount: Number(orderAmount),
      paymentMethod,
    });

    res.json({ success: true, valid: true });
  });
}

export default new DeliveryAreaController();