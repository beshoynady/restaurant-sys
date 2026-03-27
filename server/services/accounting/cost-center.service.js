import cost-centerModel from "../../models/accounting/cost-center.model.js";

class Cost-centerService {

  async create(data) {
    return await cost-centerModel.create(data);
  }

  async findAll(filter = {}) {
    return await cost-centerModel.find(filter);
  }

  async findById(id) {
    return await cost-centerModel.findById(id);
  }

  async update(id, data) {
    return await cost-centerModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await cost-centerModel.findByIdAndDelete(id);
  }

}

export default new Cost-centerService();