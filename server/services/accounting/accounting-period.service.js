import accounting-periodModel from "../../models/accounting/accounting-period.model.js";

class Accounting-periodService {

  async create(data) {
    return await accounting-periodModel.create(data);
  }

  async findAll(filter = {}) {
    return await accounting-periodModel.find(filter);
  }

  async findById(id) {
    return await accounting-periodModel.findById(id);
  }

  async update(id, data) {
    return await accounting-periodModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await accounting-periodModel.findByIdAndDelete(id);
  }

}

export default new Accounting-periodService();