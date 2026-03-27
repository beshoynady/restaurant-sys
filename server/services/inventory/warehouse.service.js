import warehouseModel from "../../models/inventory/warehouse.model.js";

class WarehouseService {

  async create(data) {
    return await warehouseModel.create(data);
  }

  async findAll(filter = {}) {
    return await warehouseModel.find(filter);
  }

  async findById(id) {
    return await warehouseModel.findById(id);
  }

  async update(id, data) {
    return await warehouseModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await warehouseModel.findByIdAndDelete(id);
  }

}

export default new WarehouseService();