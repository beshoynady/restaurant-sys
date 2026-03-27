import loyalty-transactionModel from "../../models/loyalty/loyalty-transaction.model.js";

class Loyalty-transactionService {

  async create(data) {
    return await loyalty-transactionModel.create(data);
  }

  async findAll(filter = {}) {
    return await loyalty-transactionModel.find(filter);
  }

  async findById(id) {
    return await loyalty-transactionModel.findById(id);
  }

  async update(id, data) {
    return await loyalty-transactionModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await loyalty-transactionModel.findByIdAndDelete(id);
  }

}

export default new Loyalty-transactionService();