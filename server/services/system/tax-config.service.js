import tax-configModel from "../../models/system/tax-config.model.js";

class Tax-configService {

  async create(data) {
    return await tax-configModel.create(data);
  }

  async findAll(filter = {}) {
    return await tax-configModel.find(filter);
  }

  async findById(id) {
    return await tax-configModel.findById(id);
  }

  async update(id, data) {
    return await tax-configModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await tax-configModel.findByIdAndDelete(id);
  }

}

export default new Tax-configService();