import BaseController from "../BaseController.js";
import departmentService from "../../services/employees/department.service.js";

class DepartmentController extends BaseController {
  constructor() {
    super(departmentService);
  }
}

export default new DepartmentController();
