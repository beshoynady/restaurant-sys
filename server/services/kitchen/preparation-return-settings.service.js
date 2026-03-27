import preparation-return-settingsModel from "../../models/kitchen/preparation-return-settings.model.js";

class Preparation-return-settingsService {

  async create(data) {
    return await preparation-return-settingsModel.create(data);
  }

  async findAll(filter = {}) {
    return await preparation-return-settingsModel.find(filter);
  }

  async findById(id) {
    return await preparation-return-settingsModel.findById(id);
  }

  async update(id, data) {
    return await preparation-return-settingsModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await preparation-return-settingsModel.findByIdAndDelete(id);
  }

}

export default new Preparation-return-settingsService();