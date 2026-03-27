import sales-return-settingsModel from "../../models/sales/sales-return-settings.model.js";

class Sales-return-settingsService {

  async create(data) {
    return await sales-return-settingsModel.create(data);
  }

  async findAll(filter = {}) {
    return await sales-return-settingsModel.find(filter);
  }

  async findById(id) {
    return await sales-return-settingsModel.findById(id);
  }

  async update(id, data) {
    return await sales-return-settingsModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await sales-return-settingsModel.findByIdAndDelete(id);
  }

}

export default new Sales-return-settingsService();