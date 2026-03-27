import preparation-sectionModel from "../../models/kitchen/preparation-section.model.js";

class Preparation-sectionService {

  async create(data) {
    return await preparation-sectionModel.create(data);
  }

  async findAll(filter = {}) {
    return await preparation-sectionModel.find(filter);
  }

  async findById(id) {
    return await preparation-sectionModel.findById(id);
  }

  async update(id, data) {
    return await preparation-sectionModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await preparation-sectionModel.findByIdAndDelete(id);
  }

}

export default new Preparation-sectionService();