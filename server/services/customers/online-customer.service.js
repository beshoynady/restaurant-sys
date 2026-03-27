import online-customerModel from "../../models/customers/online-customer.model.js";

class Online-customerService {

  async create(data) {
    return await online-customerModel.create(data);
  }

  async findAll(filter = {}) {
    return await online-customerModel.find(filter);
  }

  async findById(id) {
    return await online-customerModel.findById(id);
  }

  async update(id, data) {
    return await online-customerModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await online-customerModel.findByIdAndDelete(id);
  }

}

export default new Online-customerService();