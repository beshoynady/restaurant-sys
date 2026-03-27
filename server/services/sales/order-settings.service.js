import order-settingsModel from "../../models/sales/order-settings.model.js";

class Order-settingsService {

  async create(data) {
    return await order-settingsModel.create(data);
  }

  async findAll(filter = {}) {
    return await order-settingsModel.find(filter);
  }

  async findById(id) {
    return await order-settingsModel.findById(id);
  }

  async update(id, data) {
    return await order-settingsModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await order-settingsModel.findByIdAndDelete(id);
  }

}

export default new Order-settingsService();