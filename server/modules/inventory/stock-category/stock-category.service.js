import StockCategoryModel from "./stock-category.model.js";

class StockCategoryService {

  async create(data) {
    return await StockCategoryModel.create(data);
  }

  async findAll(filter = {}) {
    return await StockCategoryModel.find(filter);
  }

  async findById(id) {
    return await StockCategoryModel.findById(id);
  }

  async update(id, data) {
    return await StockCategoryModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await StockCategoryModel.findByIdAndDelete(id);
  }

}

export default new StockCategoryService();