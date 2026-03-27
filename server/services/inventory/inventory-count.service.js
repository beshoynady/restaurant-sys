import inventory-countModel from "../../models/inventory/inventory-count.model.js";

class Inventory-countService {

  async create(data) {
    return await inventory-countModel.create(data);
  }

  async findAll(filter = {}) {
    return await inventory-countModel.find(filter);
  }

  async findById(id) {
    return await inventory-countModel.findById(id);
  }

  async update(id, data) {
    return await inventory-countModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await inventory-countModel.findByIdAndDelete(id);
  }

}

export default new Inventory-countService();