import asset-transactionsModel from "../../models/assets/asset-transactions.model.js";

class Asset-transactionsService {

  async create(data) {
    return await asset-transactionsModel.create(data);
  }

  async findAll(filter = {}) {
    return await asset-transactionsModel.find(filter);
  }

  async findById(id) {
    return await asset-transactionsModel.findById(id);
  }

  async update(id, data) {
    return await asset-transactionsModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await asset-transactionsModel.findByIdAndDelete(id);
  }

}

export default new Asset-transactionsService();