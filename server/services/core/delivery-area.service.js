// services/core/delivery-area.service.js

import AdvancedService from "../../utils/AdvancedService.js";
import DeliveryAreaModel from "../../models/core/delivery-area.model.js";
import throwError from "../../utils/throwError.js";

/**
 * DeliveryAreaService
 * -------------------------------------------------------
 * Handles:
 * - CRUD (via AdvancedService)
 * - Delivery pricing logic
 * - Order validation rules
 */
class DeliveryAreaService extends AdvancedService {
  constructor() {
    super(DeliveryAreaModel, {
      brandScoped: true,
      softDelete: true,
      defaultPopulate: ["brand", "branch", "createdBy", "updatedBy", "deletedBy"],
      searchFields: ["name.EN", "name.AR", "code"],
      defaultSort: { priority: -1, createdAt: -1 },
    });
  }

  // =====================================================
  // 🔹 GET AREA (SAFE)
  // =====================================================
  async getArea({ areaId, brandId }) {
    const area = await this.findById({
      id: areaId,
      brandId,
    });

    if (!area) {
      throw throwError("Delivery area not found", 404);
    }

    if (!area.isActive) {
      throw throwError("Delivery area is inactive", 400);
    }

    return area;
  }

  // =====================================================
  // 🔹 CALCULATE DELIVERY FEE
  // =====================================================
  async calculateDeliveryFee({ areaId, brandId, orderAmount = 0 }) {
    const area = await this.getArea({ areaId, brandId });

    if (
      area.freeDeliveryThreshold &&
      orderAmount >= area.freeDeliveryThreshold
    ) {
      return 0;
    }

    return area.deliveryFee;
  }

  // =====================================================
  // 🔹 VALIDATE ORDER
  // =====================================================
  async validateOrder({
    areaId,
    brandId,
    orderAmount = 0,
    paymentMethod,
  }) {
    const area = await this.getArea({ areaId, brandId });

    // Minimum order
    if (orderAmount < area.minimumOrderAmount) {
      throw throwError(
        `Minimum order amount is ${area.minimumOrderAmount}`,
        400
      );
    }

    // Payment validation
    if (paymentMethod === "cash" && !area.acceptsCashOnDelivery) {
      throw throwError("Cash on delivery not allowed in this area", 400);
    }

    if (paymentMethod === "online" && !area.acceptsOnlinePayment) {
      throw throwError("Online payment not allowed in this area", 400);
    }

    return true;
  }

  // =====================================================
  // 🔹 DELIVERY SUMMARY (CHECKOUT)
  // =====================================================
  async getDeliverySummary({ areaId, brandId, orderAmount = 0 }) {
    const area = await this.getArea({ areaId, brandId });

    const deliveryFee = await this.calculateDeliveryFee({
      areaId,
      brandId,
      orderAmount,
    });

    return {
      areaId: area._id,
      deliveryFee,
      estimatedTime: area.estimatedDeliveryTime,
      isFreeDelivery:
        area.freeDeliveryThreshold &&
        orderAmount >= area.freeDeliveryThreshold,
      minimumOrderAmount: area.minimumOrderAmount,
    };
  }

  // =====================================================
  // 🔹 GET ACTIVE AREAS BY BRANCH
  // =====================================================
  async getActiveAreasByBranch({ branchId, brandId }) {
    return this.model
      .find({
        branch: branchId,
        brand: brandId,
        isActive: true,
        isDeleted: false,
      })
      .sort({ priority: -1 })
      .lean();
  }
}

export default new DeliveryAreaService();