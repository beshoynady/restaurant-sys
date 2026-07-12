// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration + business rules only.
import throwError from "../../../utils/throwError.js";
import DeliveryAreaRepository from "./delivery-area.repository.js";

// SECURITY: `areaId` alone is never sufficient to identify a delivery area for the public
// (customer-facing) endpoints below. Those routes have no `authenticateToken`, so there is no
// trustworthy `req.user.brandId` to scope by — `branchId`, taken from the URL, is the only tenant
// signal available, and `brand` is derived from it server-side (never trusted from the client) so
// every query is filtered by brand + branch + area id together. Querying by area id alone would
// let anyone enumerate ObjectIds and read/calculate pricing for another brand's delivery areas.
class DeliveryAreaService extends DeliveryAreaRepository {
  // Resolve `brand` from `branch` server-side — see class-level comment above.
  async resolveBrandForBranch(branchId) {
    const brandId = await this.findBrandIdForBranch(branchId);
    if (!brandId) throwError("Branch not found", 404);
    return brandId;
  }

  // GET AREA (SAFE) — always filters by brand + branch + _id together.
  async getArea({ areaId, branchId }) {
    const brandId = await this.resolveBrandForBranch(branchId);
    const area = await this.findAreaScoped(areaId, brandId, branchId);

    if (!area) {
      throwError("Delivery area not found", 404);
    }

    if (area.status !== "active") {
      throwError("Delivery area is inactive", 400);
    }

    return area;
  }

  async calculateDeliveryFee({ areaId, branchId, orderAmount = 0 }) {
    const area = await this.getArea({ areaId, branchId });

    if (area.freeDeliveryThreshold && orderAmount >= area.freeDeliveryThreshold) {
      return 0;
    }

    return area.deliveryFee;
  }

  async validateOrder({ areaId, branchId, orderAmount = 0, paymentMethod }) {
    const area = await this.getArea({ areaId, branchId });

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

  async getDeliverySummary({ areaId, branchId, orderAmount = 0 }) {
    const area = await this.getArea({ areaId, branchId });
    const deliveryFee = await this.calculateDeliveryFee({ areaId, branchId, orderAmount });

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

  async getActiveAreasByBranch({ branchId }) {
    const brandId = await this.resolveBrandForBranch(branchId);
    return this.findActiveByBranch(branchId, brandId);
  }

  // Resolves which delivery area (if any) covers a raw lat/lng — the
  // primary real-world entry point for a checkout flow ("customer drops a
  // pin / enters an address"). Previously every method above required the
  // frontend to already know `areaId`, with no way to derive it from a
  // coordinate — the polygon coverage data existed but nothing ever
  // queried it by point. "Outside coverage" is a normal business outcome
  // here (a legitimate "sorry, we don't deliver there"), not a 500 —
  // returns 404 like every other not-found case in this service.
  async resolveAreaForPoint({ branchId, lat, lng }) {
    const brandId = await this.resolveBrandForBranch(branchId);
    const [area] = await this.findAreaContainingPoint({ branchId, brandId, lng, lat });

    if (!area) {
      throwError("This location is outside our delivery coverage", 404);
    }

    return area;
  }
}

export default new DeliveryAreaService();
