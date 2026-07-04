// modules/core/brand-settings/brand-settings.controller.js

import asyncHandler from "../../../utils/asyncHandler.js";
import service from "./brand-settings.service.js";

class BrandSettingsController {
  get = asyncHandler(async (req, res) => {
    const data = await service.getByBrand(req.params.brandId);
    res.json({ success: true, data });
  });

  create = asyncHandler(async (req, res) => {
    const data = await service.create(req.params.brandId, req.body);
    res.status(201).json({ success: true, data });
  });

  update = asyncHandler(async (req, res) => {
    const data = await service.update(
      req.params.brandId,
      req.body,
      req.user.userId,
    );

    res.json({ success: true, data });
  });

  toggleModule = asyncHandler(async (req, res) => {
    const { module, enabled } = req.body;

    const data = await service.toggleModule(
      req.params.brandId,
      module,
      enabled,
    );

    res.json({ success: true, data });
  });

  softDelete = asyncHandler(async (req, res) => {
    await service.softDelete(req.params.brandId, req.user.userId);
    res.json({ success: true });
  });

  restore = asyncHandler(async (req, res) => {
    await service.restore(req.params.brandId);
    res.json({ success: true });
  });
}

export default new BrandSettingsController();
