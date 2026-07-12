import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import brandService from "./brand.service.js";

class BrandController extends BaseController {
  constructor() {
    super(brandService);
  }

  changeStatus = asyncHandler(async (req, res) => {
    const data = await this.service.changeStatus(
      req.params.id,
      req.body.status,
      req.user.userId,
    );

    res.json({ success: true, data });
  });

  updateLogo = asyncHandler(async (req, res) => {
    const data = await this.service.updateLogo(
      req.params.id,
      req.body.logo,
      req.user.userId,
    );

    res.json({ success: true, data });
  });

  updateSettings = asyncHandler(async (req, res) => {
    const data = await this.service.updateSettings(
      req.params.id,
      req.body,
      req.user.userId,
    );

    res.json({ success: true, data });
  });

  updateSetup = asyncHandler(async (req, res) => {
    const data = await this.service.updateSetupStatus(
      req.params.id,
      req.body.step,
      req.user.userId,
    );

    res.json({ success: true, data });
  });

  getSetupStatus = asyncHandler(async (req, res) => {
    const data = await this.service.getSetupStatus(req.params.id);
    res.json({ success: true, data });
  });

  getSummary = asyncHandler(async (req, res) => {
    const data = await this.service.getSummary(req.params.id);
    res.json({ success: true, data });
  });

  search = asyncHandler(async (req, res) => {
    const data = await this.service.searchBrands(req.query.search);
    res.json({ success: true, data });
  });

  transferOwnership = asyncHandler(async (req, res) => {
    const data = await this.service.transferOwnership(
      req.params.id,
      req.body.owner,
      req.user.userId,
    );

    res.json({ success: true, data });
  });

  // Public/unauthenticated — no req.user available, no brand/branch scoping.
  getBySlug = asyncHandler(async (req, res) => {
    const data = await this.service.getPublicBySlug(req.params.slug);
    res.json({ success: true, data });
  });
}

export default new BrandController();
