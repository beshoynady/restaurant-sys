import BaseController from "../BaseController.js";
import messageService from "../../services/customers/message.service.js";

class MessageController extends BaseController {
  constructor() {
    super(messageService);
  }
}

export default new MessageController();
