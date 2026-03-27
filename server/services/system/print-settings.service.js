import print-settingsModel from "../../models/system/print-settings.model.js";

class Print-settingsService {

  async create(data) {
    return await print-settingsModel.create(data);
  }

  async findAll(filter = {}) {
    return await print-settingsModel.find(filter);
  }

  async findById(id) {
    return await print-settingsModel.findById(id);
  }

  async update(id, data) {
    return await print-settingsModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await print-settingsModel.findByIdAndDelete(id);
  }

}

export default new Print-settingsService();