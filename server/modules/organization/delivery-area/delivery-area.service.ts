// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration + business rules only.
// Extends the repository (same pattern as journal-entry.service.ts) to satisfy BaseController's
// `TService extends BaseRepository<any>` generic constraint.
import throwErrorJs from "../../../utils/throwError.js";
import DeliveryAreaRepository from "./delivery-area.repository.js";
import { type IDeliveryArea } from "./delivery-area.model.js";

const throwError = throwErrorJs as (message: string, statusCode: number) => never;

// SECURITY: `areaId` alone is never sufficient to identify a delivery area for the public
// (customer-facing) endpoints below. Those routes have no `authenticateToken`, so there is no
// trustworthy `req.user.brandId` to scope by — `branchId`, taken from the URL, is the only tenant
// signal available, and `brand` is derived from it server-side (never trusted from the client) so
// every query is filtered by brand + branch + area id together. Querying by area id alone would
// let anyone enumerate ObjectIds and read/calculate pricing for another brand's delivery areas.
interface AreaScopedInput {
  areaId: string;
  branchId: string;
}

interface FeeInput extends AreaScopedInput {
  orderAmount?: number;
}

interface ValidateOrderInput extends AreaScopedInput {
  orderAmount?: number;
  paymentMethod?: "cash" | "online";
}

class DeliveryAreaService extends DeliveryAreaRepository {
  // Resolve `brand` from `branch` server-side — see class-level comment above.
  private async resolveBrandForBranch(branchId: string): Promise<string> {
    const brandId = await this.findBrandIdForBranch(branchId);
    if (!brandId) throwError("Branch not found", 404);
    return brandId;
  }

  // GET AREA (SAFE) — always filters by brand + branch + _id together.
  async getArea({ areaId, branchId }: AreaScopedInput): Promise<IDeliveryArea> {
    const brandId = await this.resolveBrandForBranch(branchId);
    const area = await this.findAreaScoped(areaId, brandId, branchId);

    if (!area) {
      throwError("Delivery area not found", 404);
    }

    // Cast after the guard above: `throwError` is typed as returning `never`
    // but TS's narrowing doesn't reliably follow through a variable-typed
    // function call — same `as`-after-guard pattern used in branch.service.ts.
    const foundArea = area as IDeliveryArea;

    if (foundArea.status !== "active") {
      throwError("Delivery area is inactive", 400);
    }

    return foundArea;
  }

  async calculateDeliveryFee({ areaId, branchId, orderAmount = 0 }: FeeInput): Promise<number> {
    const area = await this.getArea({ areaId, branchId });

    if (area.freeDeliveryThreshold && orderAmount >= area.freeDeliveryThreshold) {
      return 0;
    }

    return area.deliveryFee;
  }

  async validateOrder({
    areaId,
    branchId,
    orderAmount = 0,
    paymentMethod,
  }: ValidateOrderInput): Promise<true> {
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

  async getDeliverySummary({ areaId, branchId, orderAmount = 0 }: FeeInput) {
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

  async getActiveAreasByBranch({ branchId }: { branchId: string }) {
    const brandId = await this.resolveBrandForBranch(branchId);
    return this.findActiveByBranch(branchId, brandId);
  }
}

export default new DeliveryAreaService();
