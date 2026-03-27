import preparation-ticket-settingsModel from "../../models/kitchen/preparation-ticket-settings.model.js";

class Preparation-ticket-settingsService {

  async create(data) {
    return await preparation-ticket-settingsModel.create(data);
  }

  async findAll(filter = {}) {
    return await preparation-ticket-settingsModel.find(filter);
  }

  async findById(id) {
    return await preparation-ticket-settingsModel.findById(id);
  }

  async update(id, data) {
    return await preparation-ticket-settingsModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await preparation-ticket-settingsModel.findByIdAndDelete(id);
  }

}

export default new Preparation-ticket-settingsService();