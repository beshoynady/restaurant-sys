import supplier-transactionModel from "../../models/purchasing/supplier-transaction.model.js";

class Supplier-transactionService {

  async create(data) {
    return await supplier-transactionModel.create(data);
  }

  async findAll(filter = {}) {
    return await supplier-transactionModel.find(filter);
  }

  async findById(id) {
    return await supplier-transactionModel.findById(id);
  }

  async update(id, data) {
    return await supplier-transactionModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await supplier-transactionModel.findByIdAndDelete(id);
  }

}

export default new Supplier-transactionService();