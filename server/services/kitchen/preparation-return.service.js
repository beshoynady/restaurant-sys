import preparation-returnModel from "../../models/kitchen/preparation-return.model.js";

class Preparation-returnService {

  async create(data) {
    return await preparation-returnModel.create(data);
  }

  async findAll(filter = {}) {
    return await preparation-returnModel.find(filter);
  }

  async findById(id) {
    return await preparation-returnModel.findById(id);
  }

  async update(id, data) {
    return await preparation-returnModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await preparation-returnModel.findByIdAndDelete(id);
  }

}

export default new Preparation-returnService();