import BaseController from "../../../utils/BaseController.js";
import departmentService from "./department.service.js";

class DepartmentController extends BaseController {
  constructor() {
    super(departmentService);
  }
}

export default new DepartmentController();
