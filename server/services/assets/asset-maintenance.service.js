import asset-maintenanceModel from "../../models/assets/asset-maintenance.model.js";

class Asset-maintenanceService {

  async create(data) {
    return await asset-maintenanceModel.create(data);
  }

  async findAll(filter = {}) {
    return await asset-maintenanceModel.find(filter);
  }

  async findById(id) {
    return await asset-maintenanceModel.findById(id);
  }

  async update(id, data) {
    return await asset-maintenanceModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await asset-maintenanceModel.findByIdAndDelete(id);
  }

}

export default new Asset-maintenanceService();