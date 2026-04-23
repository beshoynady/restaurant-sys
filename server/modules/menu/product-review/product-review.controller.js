import BaseController from "../../utils/BaseController.js";
import productReviewService from "./product-review.service.js";

class ProductReviewController extends BaseController {
  constructor() {
    super(productReviewService);
  }
}

export default new ProductReviewController();
