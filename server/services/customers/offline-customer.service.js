import offline-customerModel from "../../models/customers/offline-customer.model.js";

class Offline-customerService {

  async create(data) {
    return await offline-customerModel.create(data);
  }

  async findAll(filter = {}) {
    return await offline-customerModel.find(filter);
  }

  async findById(id) {
    return await offline-customerModel.findById(id);
  }

  async update(id, data) {
    return await offline-customerModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await offline-customerModel.findByIdAndDelete(id);
  }

}

export default new Offline-customerService();