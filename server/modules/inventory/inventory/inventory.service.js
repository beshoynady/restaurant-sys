import InventoryModel from "./inventory.model.js";

class InventoryService {

  async create(data) {
    return await InventoryModel.create(data);
  }

  async findAll(filter = {}) {
    return await InventoryModel.find(filter);
  }

  async findById(id) {
    return await InventoryModel.findById(id);
  }

  async update(id, data) {
    return await InventoryModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await InventoryModel.findByIdAndDelete(id);
  }

}

export default new InventoryService();