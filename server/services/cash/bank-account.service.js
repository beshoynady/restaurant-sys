import bank-accountModel from "../../models/cash/bank-account.model.js";

class Bank-accountService {

  async create(data) {
    return await bank-accountModel.create(data);
  }

  async findAll(filter = {}) {
    return await bank-accountModel.find(filter);
  }

  async findById(id) {
    return await bank-accountModel.findById(id);
  }

  async update(id, data) {
    return await bank-accountModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await bank-accountModel.findByIdAndDelete(id);
  }

}

export default new Bank-accountService();