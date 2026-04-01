import BaseController from "../BaseController.js";
import deliveryAreaService from "../../services/core/delivery-area.service.js";

class DeliveryAreaController extends BaseController {
  constructor() {
    super(deliveryAreaService);
  }
}

export default new DeliveryAreaController();
