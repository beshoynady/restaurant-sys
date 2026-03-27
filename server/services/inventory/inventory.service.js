import inventoryModel from "../../models/inventory/inventory.model.js";

class InventoryService {

  async create(data) {
    return await inventoryModel.create(data);
  }

  async findAll(filter = {}) {
    return await inventoryModel.find(filter);
  }

  async findById(id) {
    return await inventoryModel.findById(id);
  }

  async update(id, data) {
    return await inventoryModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await inventoryModel.findByIdAndDelete(id);
  }

}

export default new InventoryService();