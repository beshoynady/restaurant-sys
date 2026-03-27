import purchase-returnModel from "../../models/purchasing/purchase-return.model.js";

class Purchase-returnService {

  async create(data) {
    return await purchase-returnModel.create(data);
  }

  async findAll(filter = {}) {
    return await purchase-returnModel.find(filter);
  }

  async findById(id) {
    return await purchase-returnModel.findById(id);
  }

  async update(id, data) {
    return await purchase-returnModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await purchase-returnModel.findByIdAndDelete(id);
  }

}

export default new Purchase-returnService();