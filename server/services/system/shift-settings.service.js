import shift-settingsModel from "../../models/system/shift-settings.model.js";

class Shift-settingsService {

  async create(data) {
    return await shift-settingsModel.create(data);
  }

  async findAll(filter = {}) {
    return await shift-settingsModel.find(filter);
  }

  async findById(id) {
    return await shift-settingsModel.findById(id);
  }

  async update(id, data) {
    return await shift-settingsModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await shift-settingsModel.findByIdAndDelete(id);
  }

}

export default new Shift-settingsService();