import menu-categoryModel from "../../models/menu/menu-category.model.js";

class Menu-categoryService {

  async create(data) {
    return await menu-categoryModel.create(data);
  }

  async findAll(filter = {}) {
    return await menu-categoryModel.find(filter);
  }

  async findById(id) {
    return await menu-categoryModel.findById(id);
  }

  async update(id, data) {
    return await menu-categoryModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await menu-categoryModel.findByIdAndDelete(id);
  }

}

export default new Menu-categoryService();