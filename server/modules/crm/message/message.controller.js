import BaseController from "../../../utils/BaseController.js";
import messageService from "./message.service.js";

class MessageController extends BaseController {
  constructor() {
    super(messageService);
  }
}

export default new MessageController();
