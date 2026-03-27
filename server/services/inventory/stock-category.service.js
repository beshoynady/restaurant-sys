import stock-categoryModel from "../../models/inventory/stock-category.model.js";

class Stock-categoryService {

  async create(data) {
    return await stock-categoryModel.create(data);
  }

  async findAll(filter = {}) {
    return await stock-categoryModel.find(filter);
  }

  async findById(id) {
    return await stock-categoryModel.findById(id);
  }

  async update(id, data) {
    return await stock-categoryModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await stock-categoryModel.findByIdAndDelete(id);
  }

}

export default new Stock-categoryService();