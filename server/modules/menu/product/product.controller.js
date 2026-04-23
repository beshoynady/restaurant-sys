import BaseController from "../../../utils/BaseController.js";
import productService from "./product.service.js";

class ProductController extends BaseController {
  constructor() {
    super(productService);
  }
}

export default new ProductController();
