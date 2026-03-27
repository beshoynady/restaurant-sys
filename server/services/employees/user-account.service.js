import user-accountModel from "../../models/employees/user-account.model.js";

class User-accountService {

  async create(data) {
    return await user-accountModel.create(data);
  }

  async findAll(filter = {}) {
    return await user-accountModel.find(filter);
  }

  async findById(id) {
    return await user-accountModel.findById(id);
  }

  async update(id, data) {
    return await user-accountModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await user-accountModel.findByIdAndDelete(id);
  }

}

export default new User-accountService();