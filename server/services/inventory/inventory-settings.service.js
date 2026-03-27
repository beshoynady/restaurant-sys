import inventory-settingsModel from "../../models/inventory/inventory-settings.model.js";

class Inventory-settingsService {

  async create(data) {
    return await inventory-settingsModel.create(data);
  }

  async findAll(filter = {}) {
    return await inventory-settingsModel.find(filter);
  }

  async findById(id) {
    return await inventory-settingsModel.findById(id);
  }

  async update(id, data) {
    return await inventory-settingsModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await inventory-settingsModel.findByIdAndDelete(id);
  }

}

export default new Inventory-settingsService();