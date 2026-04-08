import BaseController from "../../utils/BaseController.js";
import menuCategoryService from "../../services/menu/menu-category.service.js";

class MenuCategoryController extends BaseController {
  constructor() {
    super(menuCategoryService);
  }
}

export default new MenuCategoryController();
