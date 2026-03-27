import dining-areaModel from "../../models/seating/dining-area.model.js";

class Dining-areaService {

  async create(data) {
    return await dining-areaModel.create(data);
  }

  async findAll(filter = {}) {
    return await dining-areaModel.find(filter);
  }

  async findById(id) {
    return await dining-areaModel.findById(id);
  }

  async update(id, data) {
    return await dining-areaModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await dining-areaModel.findByIdAndDelete(id);
  }

}

export default new Dining-areaService();