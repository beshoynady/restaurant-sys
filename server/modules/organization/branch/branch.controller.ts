import { Request, Response } from "express";
import BaseController from "../../../utils/BaseController.js";
import asyncHandlerJs from "../../../utils/asyncHandler.js";
import branchService from "./branch.service.js";

const asyncHandler = asyncHandlerJs as (
  fn: (req: Request, res: Response) => Promise<void>,
) => (req: Request, res: Response, next: (err?: unknown) => void) => void;

class BranchController extends BaseController<typeof branchService> {
  constructor() {
    super(branchService);
  }

  setMainBranch = asyncHandler(async (req: Request, res: Response) => {
    const { brandId, userId } = (req as any).user;

    const data = await branchService.setMainBranch({
      id: req.params.id,
      brandId,
      userId,
    });

    res.json({ success: true, data });
  });

  getAllBranches = asyncHandler(async (req: Request, res: Response) => {
    const { brandId } = (req as any).user;

    const result = await branchService.getAllBranches({
      brandId,
      query: req.query as any,
    });

    res.json(result);
  });

  // Fixed: previously never sent a response, leaving the request hanging
  // until client/proxy timeout (see BACKEND_FOUNDATION.md-tracked bug).
  hardDelete = asyncHandler(async (req: Request, res: Response) => {
    const { brandId } = (req as any).user;

    const data = await branchService.hardDelete({
      id: req.params.id,
      brandId,
    });

    res.json({ success: true, data, message: "Branch permanently deleted" });
  });

  softDelete = asyncHandler(async (req: Request, res: Response) => {
    const { brandId, userId } = (req as any).user;

    const data = await branchService.softDelete({
      id: req.params.id,
      brandId,
      userId,
    });

    res.json({ success: true, data });
  });

  bulkSoftDelete = asyncHandler(async (req: Request, res: Response) => {
    const { brandId, userId } = (req as any).user;

    const data = await branchService.bulkSoftDelete({
      ids: req.body.ids,
      brandId,
      userId,
    });

    res.json({ success: true, data });
  });

  bulkHardDelete = asyncHandler(async (req: Request, res: Response) => {
    const { brandId } = (req as any).user;

    const data = await branchService.bulkHardDelete({
      ids: req.body.ids,
      brandId,
    });

    res.json({ success: true, data });
  });

  restore = asyncHandler(async (req: Request, res: Response) => {
    const { brandId } = (req as any).user;

    const data = await branchService.restore({
      id: req.params.id,
      brandId,
    });

    res.json({ success: true, data });
  });
}

export default new BranchController();
