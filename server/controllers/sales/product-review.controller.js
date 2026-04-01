import BaseController from "../BaseController.js";
import productReviewService from "../../services/sales/product-review.service.js";

class ProductReviewController extends BaseController {
  constructor() {
    super(productReviewService);
  }
}

export default new ProductReviewController();
