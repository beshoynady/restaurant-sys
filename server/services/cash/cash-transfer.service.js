import cash-transferModel from "../../models/cash/cash-transfer.model.js";

class Cash-transferService {

  async create(data) {
    return await cash-transferModel.create(data);
  }

  async findAll(filter = {}) {
    return await cash-transferModel.find(filter);
  }

  async findById(id) {
    return await cash-transferModel.findById(id);
  }

  async update(id, data) {
    return await cash-transferModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await cash-transferModel.findByIdAndDelete(id);
  }

}

export default new Cash-transferService();