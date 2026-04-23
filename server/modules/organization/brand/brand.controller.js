import BaseController from "../../../utils/BaseController.js";
import brandService from "./brand.service.js";

class BrandController extends BaseController {
  constructor() {
    super(brandService);
  }
}

export default new BrandController();
