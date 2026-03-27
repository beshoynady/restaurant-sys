import cash-registerModel from "../../models/cash/cash-register.model.js";

class Cash-registerService {

  async create(data) {
    return await cash-registerModel.create(data);
  }

  async findAll(filter = {}) {
    return await cash-registerModel.find(filter);
  }

  async findById(id) {
    return await cash-registerModel.findById(id);
  }

  async update(id, data) {
    return await cash-registerModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await cash-registerModel.findByIdAndDelete(id);
  }

}

export default new Cash-registerService();