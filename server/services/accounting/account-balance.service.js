import account-balanceModel from "../../models/accounting/account-balance.model.js";

class Account-balanceService {

  async create(data) {
    return await account-balanceModel.create(data);
  }

  async findAll(filter = {}) {
    return await account-balanceModel.find(filter);
  }

  async findById(id) {
    return await account-balanceModel.findById(id);
  }

  async update(id, data) {
    return await account-balanceModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await account-balanceModel.findByIdAndDelete(id);
  }

}

export default new Account-balanceService();