import stock-ledgerModel from "../../models/inventory/stock-ledger.model.js";

class Stock-ledgerService {

  async create(data) {
    return await stock-ledgerModel.create(data);
  }

  async findAll(filter = {}) {
    return await stock-ledgerModel.find(filter);
  }

  async findById(id) {
    return await stock-ledgerModel.findById(id);
  }

  async update(id, data) {
    return await stock-ledgerModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await stock-ledgerModel.findByIdAndDelete(id);
  }

}

export default new Stock-ledgerService();