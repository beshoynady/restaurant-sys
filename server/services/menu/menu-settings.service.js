import menu-settingsModel from "../../models/menu/menu-settings.model.js";

class Menu-settingsService {

  async create(data) {
    return await menu-settingsModel.create(data);
  }

  async findAll(filter = {}) {
    return await menu-settingsModel.find(filter);
  }

  async findById(id) {
    return await menu-settingsModel.findById(id);
  }

  async update(id, data) {
    return await menu-settingsModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await menu-settingsModel.findByIdAndDelete(id);
  }

}

export default new Menu-settingsService();