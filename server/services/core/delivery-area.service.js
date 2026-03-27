import delivery-areaModel from "../../models/core/delivery-area.model.js";

class Delivery-areaService {

  async create(data) {
    return await delivery-areaModel.create(data);
  }

  async findAll(filter = {}) {
    return await delivery-areaModel.find(filter);
  }

  async findById(id) {
    return await delivery-areaModel.findById(id);
  }

  async update(id, data) {
    return await delivery-areaModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await delivery-areaModel.findByIdAndDelete(id);
  }

}

export default new Delivery-areaService();