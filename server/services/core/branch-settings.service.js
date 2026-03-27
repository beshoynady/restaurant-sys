import branch-settingsModel from "../../models/core/branch-settings.model.js";

class Branch-settingsService {

  async create(data) {
    return await branch-settingsModel.create(data);
  }

  async findAll(filter = {}) {
    return await branch-settingsModel.find(filter);
  }

  async findById(id) {
    return await branch-settingsModel.findById(id);
  }

  async update(id, data) {
    return await branch-settingsModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await branch-settingsModel.findByIdAndDelete(id);
  }

}

export default new Branch-settingsService();