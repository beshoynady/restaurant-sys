import BaseController from "../../utils/BaseController.js";
import roleService from "../../services/employees/role.service.js";

class RoleController extends BaseController {
  constructor() {
    super(roleService);
  }
}

export default new RoleController();
