import purchase-settingsModel from "../../models/purchasing/purchase-settings.model.js";

class Purchase-settingsService {

  async create(data) {
    return await purchase-settingsModel.create(data);
  }

  async findAll(filter = {}) {
    return await purchase-settingsModel.find(filter);
  }

  async findById(id) {
    return await purchase-settingsModel.findById(id);
  }

  async update(id, data) {
    return await purchase-settingsModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await purchase-settingsModel.findByIdAndDelete(id);
  }

}

export default new Purchase-settingsService();