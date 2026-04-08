import BaseController from "../../utils/BaseController.js";
import promotionService from "../../services/sales/promotion.service.js";

class PromotionController extends BaseController {
  constructor() {
    super(promotionService);
  }
}

export default new PromotionController();
