import invoice-settingsModel from "../../models/sales/invoice-settings.model.js";

class Invoice-settingsService {

  async create(data) {
    return await invoice-settingsModel.create(data);
  }

  async findAll(filter = {}) {
    return await invoice-settingsModel.find(filter);
  }

  async findById(id) {
    return await invoice-settingsModel.findById(id);
  }

  async update(id, data) {
    return await invoice-settingsModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await invoice-settingsModel.findByIdAndDelete(id);
  }

}

export default new Invoice-settingsService();