import asyncHandler from "../../../utils/asyncHandler.js";
import BaseController from "../../../utils/BaseController.js";
import brandSettingsService from "./brand-settings.service.js";

/**
 * notes:
 * - Generic `_id`-based CRUD (create/getAll/getOne/update/softDelete/restore/
 *   hardDelete/bulk*) is inherited from BaseController — admin/platform tooling.
 * - The brand-scoped methods below (`getByBrand`/`createForBrand`/etc.) are the
 *   primary access pattern for this 1-doc-per-brand settings resource, routed
 *   under `/brand/:brandId` (see brand-settings.router.js).
 */
class BrandSettingsController extends BaseController {
  constructor() {
    super(brandSettingsService);
  }

  getByBrand = asyncHandler(async (req, res) => {
    const data = await brandSettingsService.getByBrand(req.params.brandId);
    res.json({ success: true, data });
  });

  createForBrand = asyncHandler(async (req, res) => {
    const data = await brandSettingsService.createForBrand(
      req.params.brandId,
      req.body,
      req.user?.userId,
    );

    res.status(201).json({ success: true, data });
  });

  updateForBrand = asyncHandler(async (req, res) => {
    const data = await brandSettingsService.updateForBrand(
      req.params.brandId,
      req.body,
      req.user?.userId,
    );

    res.json({ success: true, data });
  });

  toggleModule = asyncHandler(async (req, res) => {
    const { module: moduleKey, enabled } = req.body;

    const data = await brandSettingsService.toggleModule(req.params.brandId, moduleKey, enabled);

    res.json({ success: true, data });
  });

  softDeleteForBrand = asyncHandler(async (req, res) => {
    await brandSettingsService.softDeleteForBrand(req.params.brandId, req.user?.userId);
    res.json({ success: true });
  });

  restoreForBrand = asyncHandler(async (req, res) => {
    await brandSettingsService.restoreForBrand(req.params.brandId);
    res.json({ success: true });
  });
}

export default new BrandSettingsController();
