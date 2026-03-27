import discount-settingsModel from "../../models/system/discount-settings.model.js";

class Discount-settingsService {

  async create(data) {
    return await discount-settingsModel.create(data);
  }

  async findAll(filter = {}) {
    return await discount-settingsModel.find(filter);
  }

  async findById(id) {
    return await discount-settingsModel.findById(id);
  }

  async update(id, data) {
    return await discount-settingsModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await discount-settingsModel.findByIdAndDelete(id);
  }

}

export default new Discount-settingsService();