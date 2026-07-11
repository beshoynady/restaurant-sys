import BaseService from "../../../utils/BaseService.js";
import throwErrorJs from "../../../utils/throwError.js";
import DeliveryAreaModel, { type IDeliveryArea } from "./delivery-area.model.js";

const throwError = throwErrorJs as (message: string, statusCode: number) => never;

interface AreaScopedInput {
  areaId: string;
  brandId: string;
}

interface FeeInput extends AreaScopedInput {
  orderAmount?: number;
}

interface ValidateOrderInput extends AreaScopedInput {
  orderAmount?: number;
  paymentMethod?: "cash" | "online";
}

/**
 * DeliveryAreaService
 * -------------------------------------------------------
 * Handles:
 * - CRUD (via BaseService)
 * - Delivery pricing logic
 * - Order validation rules
 */
class DeliveryAreaService extends BaseService<IDeliveryArea> {
  constructor() {
    super(DeliveryAreaModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "createdBy", "updatedBy", "deletedBy"],
      searchableFields: ["name.EN", "name.AR", "code"],
      defaultSort: { priority: -1, createdAt: -1 },
    });
  }

  // GET AREA (SAFE)
  //
  // Fixed: previously checked `area.isActive`, a field that does not exist
  // on the schema (the real field is `status`) — every area was treated as
  // inactive regardless of its actual status, so this method (and every
  // other method below that calls it) always threw. Now correctly checks
  // `status === "active"`.
  async getArea({ areaId, brandId }: AreaScopedInput): Promise<IDeliveryArea> {
    const area = await this.findById({ id: areaId, brandId });

    if (!area) {
      throwError("Delivery area not found", 404);
    }

    if (area.status !== "active") {
      throwError("Delivery area is inactive", 400);
    }

    return area;
  }

  // CALCULATE DELIVERY FEE
  async calculateDeliveryFee({ areaId, brandId, orderAmount = 0 }: FeeInput): Promise<number> {
    const area = await this.getArea({ areaId, brandId });

    if (area.freeDeliveryThreshold && orderAmount >= area.freeDeliveryThreshold) {
      return 0;
    }

    return area.deliveryFee;
  }

  // VALIDATE ORDER
  async validateOrder({
    areaId,
    brandId,
    orderAmount = 0,
    paymentMethod,
  }: ValidateOrderInput): Promise<true> {
    const area = await this.getArea({ areaId, brandId });

    if (orderAmount < area.minimumOrderAmount) {
      throwError(`Minimum order amount is ${area.minimumOrderAmount}`, 400);
    }

    if (paymentMethod === "cash" && !area.acceptsCashOnDelivery) {
      throwError("Cash on delivery not allowed in this area", 400);
    }

    if (paymentMethod === "online" && !area.acceptsOnlinePayment) {
      throwError("Online payment not allowed in this area", 400);
    }

    return true;
  }

  // DELIVERY SUMMARY (CHECKOUT)
  //
  // Fixed: previously returned `area.estimatedDeliveryTime`, a field that
  // does not exist (real field is `estimatedDeliveryTimeMinutes`) — always
  // returned undefined.
  async getDeliverySummary({ areaId, brandId, orderAmount = 0 }: FeeInput) {
    const area = await this.getArea({ areaId, brandId });
    const deliveryFee = await this.calculateDeliveryFee({ areaId, brandId, orderAmount });

    return {
      areaId: area._id,
      deliveryFee,
      estimatedTime: area.estimatedDeliveryTimeMinutes,
      isFreeDelivery: Boolean(
        area.freeDeliveryThreshold && orderAmount >= area.freeDeliveryThreshold,
      ),
      minimumOrderAmount: area.minimumOrderAmount,
    };
  }

  // GET ACTIVE AREAS BY BRANCH
  //
  // Fixed: previously queried `{isActive: true}` — the nonexistent field —
  // and always returned an empty array regardless of real data.
  async getActiveAreasByBranch({ branchId, brandId }: { branchId: string; brandId: string }) {
    return this.model
      .find({
        branch: branchId,
        brand: brandId,
        status: "active",
        isDeleted: false,
      })
      .sort({ priority: -1 })
      .lean();
  }
}

export default new DeliveryAreaService();
