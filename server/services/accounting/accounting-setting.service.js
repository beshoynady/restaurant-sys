import accounting-settingModel from "../../models/accounting/accounting-setting.model.js";

class Accounting-settingService {

  async create(data) {
    return await accounting-settingModel.create(data);
  }

  async findAll(filter = {}) {
    return await accounting-settingModel.find(filter);
  }

  async findById(id) {
    return await accounting-settingModel.findById(id);
  }

  async update(id, data) {
    return await accounting-settingModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await accounting-settingModel.findByIdAndDelete(id);
  }

}

export default new Accounting-settingService();