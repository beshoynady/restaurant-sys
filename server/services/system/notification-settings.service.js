import notification-settingsModel from "../../models/system/notification-settings.model.js";

class Notification-settingsService {

  async create(data) {
    return await notification-settingsModel.create(data);
  }

  async findAll(filter = {}) {
    return await notification-settingsModel.find(filter);
  }

  async findById(id) {
    return await notification-settingsModel.findById(id);
  }

  async update(id, data) {
    return await notification-settingsModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await notification-settingsModel.findByIdAndDelete(id);
  }

}

export default new Notification-settingsService();