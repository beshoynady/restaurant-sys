import { Request, Response } from "express";
import BaseController from "../../../utils/BaseController.js";
import asyncHandlerJs from "../../../utils/asyncHandler.js";
import deliveryAreaService from "./delivery-area.service.js";

const asyncHandler = asyncHandlerJs as (
  fn: (req: Request, res: Response) => Promise<void>,
) => (req: Request, res: Response, next: (err?: unknown) => void) => void;

/**
 * DeliveryAreaController
 *
 * notes:
 * - hardDelete/bulkHardDelete/softDelete/restore/bulkSoftDelete are NOT
 *   overridden here. A prior version of this file shadowed the inherited
 *   BaseController methods with broken ones that called the service with a
 *   raw id/ids array instead of the {id, brandId, branchId, deletedBy}
 *   shape BaseService expects — every one of those five endpoints always
 *   threw "Invalid resource ID". The inherited versions are correct.
 */
class DeliveryAreaController extends BaseController<typeof deliveryAreaService> {
  constructor() {
    super(deliveryAreaService);
  }

  // SECURITY: these four endpoints are intentionally unauthenticated
  // (customer/checkout use case — see delivery-area.router.ts). `req.user`
  // does not exist here, so tenant must never be read from it. `branchId`
  // comes from the URL and the service resolves `brand` from it server-side
  // (see delivery-area.service.ts `resolveBrandForBranch`) — this closes a
  // prior bug where these routes queried by `areaId` alone and leaked
  // delivery areas across brands to anyone who could guess an ObjectId.
  getActiveAreasByBranch = asyncHandler(async (req: Request, res: Response) => {
    const { branchId } = req.params;

    const data = await deliveryAreaService.getActiveAreasByBranch({ branchId });

    res.json({ success: true, data });
  });

  getDeliverySummary = asyncHandler(async (req: Request, res: Response) => {
    const { branchId, areaId } = req.params;
    const { orderAmount = 0 } = req.query;

    const data = await deliveryAreaService.getDeliverySummary({
      areaId,
      branchId,
      orderAmount: Number(orderAmount),
    });

    res.json({ success: true, data });
  });

  calculateDeliveryFee = asyncHandler(async (req: Request, res: Response) => {
    const { branchId, areaId } = req.params;
    const { orderAmount = 0 } = req.query;

    const fee = await deliveryAreaService.calculateDeliveryFee({
      areaId,
      branchId,
      orderAmount: Number(orderAmount),
    });

    res.json({ success: true, deliveryFee: fee });
  });

  validateOrder = asyncHandler(async (req: Request, res: Response) => {
    const { branchId, areaId } = req.params;
    const { orderAmount = 0, paymentMethod } = req.body;

    await deliveryAreaService.validateOrder({
      areaId,
      branchId,
      orderAmount: Number(orderAmount),
      paymentMethod,
    });

    res.json({ success: true, valid: true });
  });
}

export default new DeliveryAreaController();
