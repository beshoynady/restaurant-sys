import warehouse-documentModel from "../../models/inventory/warehouse-document.model.js";

class Warehouse-documentService {

  async create(data) {
    return await warehouse-documentModel.create(data);
  }

  async findAll(filter = {}) {
    return await warehouse-documentModel.find(filter);
  }

  async findById(id) {
    return await warehouse-documentModel.findById(id);
  }

  async update(id, data) {
    return await warehouse-documentModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await warehouse-documentModel.findByIdAndDelete(id);
  }

}

export default new Warehouse-documentService();