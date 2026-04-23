import BaseController from "../../../utils/BaseController.js";
import preparationTicketService from "./preparation-ticket.service.js";

class PreparationTicketController extends BaseController {
  constructor() {
    super(preparationTicketService);
  }
}

export default new PreparationTicketController();
