import BaseController from "../BaseController.js";
import brandService from "../../services/core/brand.service.js";

class BrandController extends BaseController {
  constructor() {
    super(brandService);
  }
}

export default new BrandController();
