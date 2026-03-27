import stock-transfer-requestModel from "../../models/inventory/stock-transfer-request.model.js";

class Stock-transfer-requestService {

  async create(data) {
    return await stock-transfer-requestModel.create(data);
  }

  async findAll(filter = {}) {
    return await stock-transfer-requestModel.find(filter);
  }

  async findById(id) {
    return await stock-transfer-requestModel.findById(id);
  }

  async update(id, data) {
    return await stock-transfer-requestModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await stock-transfer-requestModel.findByIdAndDelete(id);
  }

}

export default new Stock-transfer-requestService();