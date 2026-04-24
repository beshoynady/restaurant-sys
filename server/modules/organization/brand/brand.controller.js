import BaseController from "../../../utils/BaseController.js";
import brandService from "./brand.service.js";

class BrandController extends BaseController {
  constructor() {
    super(brandService);
  }

  // =========================
  // STATUS
  // =========================
  changeStatus = async (req, res) => {
    const result = await this.service.changeStatus(
      req.params.id,
      req.body.status,
      req.user.id
    );
    res.json(result);
  };

  // =========================
  // LOGO
  // =========================
  updateLogo = async (req, res) => {
    const result = await this.service.updateLogo(
      req.params.id,
      req.body.logo,
      req.user.id
    );
    res.json(result);
  };

  // =========================
  // SETTINGS
  // =========================
  updateSettings = async (req, res) => {
    const result = await this.service.updateSettings(
      req.params.id,
      req.body,
      req.user.id
    );
    res.json(result);
  };

  // =========================
  // SETUP FLOW
  // =========================
  updateSetup = async (req, res) => {
    const result = await this.service.updateSetupStatus(
      req.params.id,
      req.body.step,
      req.user.id
    );
    res.json(result);
  };

  // =========================
  // SUMMARY (DASHBOARD)
  // =========================
  getSummary = async (req, res) => {
    const result = await this.service.getSummary(req.params.id);
    res.json(result);
  };

  // =========================
  // SEARCH
  // =========================
  search = async (req, res) => {
    const result = await this.service.searchBrands(
      req.query.q,
      req.user.id
    );
    res.json(result);
  };
}

export default new BrandController();