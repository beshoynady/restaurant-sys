import BaseController from "../../utils/BaseController.js";
import productService from "../../services/menu/product.service.js";

class ProductController extends BaseController {
  constructor() {
    super(productService);
  }
}

export default new ProductController();
