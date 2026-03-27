import accountModel from "../../models/accounting/account.model.js";

class AccountService {

  async create(data) {
    return await accountModel.create(data);
  }

  async findAll(filter = {}) {
    return await accountModel.find(filter);
  }

  async findById(id) {
    return await accountModel.findById(id);
  }

  async update(id, data) {
    return await accountModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await accountModel.findByIdAndDelete(id);
  }

}

export default new AccountService();