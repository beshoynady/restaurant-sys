import { Request, Response } from "express";
import BaseController from "../../../utils/BaseController.js";
import asyncHandlerJs from "../../../utils/asyncHandler.js";
import brandSettingsService from "./brand-settings.service.js";
import { type BrandModuleKey } from "./brand-settings.model.js";

const asyncHandler = asyncHandlerJs as (
  fn: (req: Request, res: Response) => Promise<void>,
) => (req: Request, res: Response, next: (err?: unknown) => void) => void;

/**
 * notes:
 * - Generic `_id`-based CRUD (create/getAll/getOne/update/softDelete/restore/
 *   hardDelete/bulk*) is inherited from BaseController — admin/platform tooling.
 * - The brand-scoped methods below (`getByBrand`/`createForBrand`/etc.) are the
 *   primary access pattern for this 1-doc-per-brand settings resource, routed
 *   under `/brand/:brandId` (see brand-settings.router.ts).
 */
class BrandSettingsController extends BaseController<typeof brandSettingsService> {
  constructor() {
    super(brandSettingsService);
  }

  getByBrand = asyncHandler(async (req: Request, res: Response) => {
    const data = await brandSettingsService.getByBrand(req.params.brandId);
    res.json({ success: true, data });
  });

  createForBrand = asyncHandler(async (req: Request, res: Response) => {
    const data = await brandSettingsService.createForBrand(
      req.params.brandId,
      req.body,
      (req as any).user?.userId,
    );

    res.status(201).json({ success: true, data });
  });

  updateForBrand = asyncHandler(async (req: Request, res: Response) => {
    const data = await brandSettingsService.updateForBrand(
      req.params.brandId,
      req.body,
      (req as any).user?.userId,
    );

    res.json({ success: true, data });
  });

  toggleModule = asyncHandler(async (req: Request, res: Response) => {
    const { module: moduleKey, enabled } = req.body as { module: BrandModuleKey; enabled: boolean };

    const data = await brandSettingsService.toggleModule(req.params.brandId, moduleKey, enabled);

    res.json({ success: true, data });
  });

  softDeleteForBrand = asyncHandler(async (req: Request, res: Response) => {
    await brandSettingsService.softDeleteForBrand(req.params.brandId, (req as any).user?.userId);
    res.json({ success: true });
  });

  restoreForBrand = asyncHandler(async (req: Request, res: Response) => {
    await brandSettingsService.restoreForBrand(req.params.brandId);
    res.json({ success: true });
  });
}

export default new BrandSettingsController();
