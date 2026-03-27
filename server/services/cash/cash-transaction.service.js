import cash-transactionModel from "../../models/cash/cash-transaction.model.js";

class Cash-transactionService {

  async create(data) {
    return await cash-transactionModel.create(data);
  }

  async findAll(filter = {}) {
    return await cash-transactionModel.find(filter);
  }

  async findById(id) {
    return await cash-transactionModel.findById(id);
  }

  async update(id, data) {
    return await cash-transactionModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await cash-transactionModel.findByIdAndDelete(id);
  }

}

export default new Cash-transactionService();