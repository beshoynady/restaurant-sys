import sales-returnModel from "../../models/sales/sales-return.model.js";

class Sales-returnService {

  async create(data) {
    return await sales-returnModel.create(data);
  }

  async findAll(filter = {}) {
    return await sales-returnModel.find(filter);
  }

  async findById(id) {
    return await sales-returnModel.findById(id);
  }

  async update(id, data) {
    return await sales-returnModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await sales-returnModel.findByIdAndDelete(id);
  }

}

export default new Sales-returnService();