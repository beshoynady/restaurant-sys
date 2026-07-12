import BaseController from "../../../utils/BaseController.js";
import brandService from "./brand.service.js";

class BrandController extends BaseController {
  constructor() {
    super(brandService);
  }

  changeStatus = async (req, res) => {
    const data = await this.service.changeStatus(
      req.params.id,
      req.body.status,
      req.user.userId,
    );

    res.json({ success: true, data });
  };

  updateLogo = async (req, res) => {
    const data = await this.service.updateLogo(
      req.params.id,
      req.body.logo,
      req.user.userId,
    );

    res.json({ success: true, data });
  };

  updateSettings = async (req, res) => {
    const data = await this.service.updateSettings(
      req.params.id,
      req.body,
      req.user.userId,
    );

    res.json({ success: true, data });
  };

  updateSetup = async (req, res) => {
    const data = await this.service.updateSetupStatus(
      req.params.id,
      req.body.step,
      req.user.userId,
    );

    res.json({ success: true, data });
  };

  getSetupStatus = async (req, res) => {
    const data = await this.service.getSetupStatus(req.params.id);
    res.json({ success: true, data });
  };

  getSummary = async (req, res) => {
    const data = await this.service.getSummary(req.params.id);
    res.json({ success: true, data });
  };

  search = async (req, res) => {
    const data = await this.service.searchBrands(req.query.search);
    res.json({ success: true, data });
  };
}

export default new BrandController();
