import { Request, Response } from "express";
import BaseController from "../../../utils/BaseController.js";
import asyncHandlerJs from "../../../utils/asyncHandler.js";
import brandService from "./brand.service.js";

const asyncHandler = asyncHandlerJs as (
  fn: (req: Request, res: Response) => Promise<void>,
) => (req: Request, res: Response, next: (err?: unknown) => void) => void;

class BrandController extends BaseController<typeof brandService> {
  constructor() {
    super(brandService);
  }

  changeStatus = asyncHandler(async (req: Request, res: Response) => {
    const data = await brandService.changeStatus(
      req.params.id,
      req.body.status,
      (req as any).user.userId,
    );

    res.json({ success: true, data });
  });

  updateLogo = asyncHandler(async (req: Request, res: Response) => {
    const data = await brandService.updateLogo(
      req.params.id,
      req.body.logo,
      (req as any).user.userId,
    );

    res.json({ success: true, data });
  });

  updateSettings = asyncHandler(async (req: Request, res: Response) => {
    const data = await brandService.updateSettings(
      req.params.id,
      req.body,
      (req as any).user.userId,
    );

    res.json({ success: true, data });
  });

  updateSetup = asyncHandler(async (req: Request, res: Response) => {
    const data = await brandService.updateSetupStatus(
      req.params.id,
      req.body.step,
      (req as any).user.userId,
    );

    res.json({ success: true, data });
  });

  getSetupStatus = asyncHandler(async (req: Request, res: Response) => {
    const data = await brandService.getSetupStatus(req.params.id);
    res.json({ success: true, data });
  });

  getSummary = asyncHandler(async (req: Request, res: Response) => {
    const data = await brandService.getSummary(req.params.id);
    res.json({ success: true, data });
  });

  search = asyncHandler(async (req: Request, res: Response) => {
    const data = await brandService.searchBrands(req.query.search as string);
    res.json({ success: true, data });
  });
}

export default new BrandController();
