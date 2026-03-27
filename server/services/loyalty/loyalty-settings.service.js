import loyalty-settingsModel from "../../models/loyalty/loyalty-settings.model.js";

class Loyalty-settingsService {

  async create(data) {
    return await loyalty-settingsModel.create(data);
  }

  async findAll(filter = {}) {
    return await loyalty-settingsModel.find(filter);
  }

  async findById(id) {
    return await loyalty-settingsModel.findById(id);
  }

  async update(id, data) {
    return await loyalty-settingsModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await loyalty-settingsModel.findByIdAndDelete(id);
  }

}

export default new Loyalty-settingsService();