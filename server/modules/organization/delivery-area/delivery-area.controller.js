// controllers/core/delivery-area.controller.js

import BaseController from "../../../utils/BaseController.js";
import deliveryAreaService from "./delivery-area.service.js";
import asyncHandler from "../../../utils/asyncHandler.js";

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

  hardDelete = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await this.service.hardDelete(id);
    res.json({
      success: true,
      message: "Delivery area permanently deleted",
    });
  });
  bulkHardDelete = asyncHandler(async (req, res) => {
    const { ids } = req.body; // Expecting an array of IDs in the request body
    await this.service.bulkHardDelete(ids);
    res.json({
      success: true,
      message: "Delivery areas permanently deleted",
    });
  });

  softDelete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await this.service.softDelete(id);
    res.json({
      success: true,
      message: "Delivery area soft deleted",
    });
  });
  restore = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await this.service.restore(id);
    res.json({
      success: true,
      message: "Delivery area restored",
    });
  });
  bulkSoftDelete = asyncHandler(async (req, res) => {
    const { ids } = req.body; // Expecting an array of IDs in the request body
    await this.service.bulkSoftDelete(ids);
    res.json({
      success: true,
      message: "Delivery areas soft deleted",
    });
  });
}

export default new DeliveryAreaController();
