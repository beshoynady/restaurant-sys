import stock-itemModel from "../../models/inventory/stock-item.model.js";

class Stock-itemService {

  async create(data) {
    return await stock-itemModel.create(data);
  }

  async findAll(filter = {}) {
    return await stock-itemModel.find(filter);
  }

  async findById(id) {
    return await stock-itemModel.findById(id);
  }

  async update(id, data) {
    return await stock-itemModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await stock-itemModel.findByIdAndDelete(id);
  }

}

export default new Stock-itemService();