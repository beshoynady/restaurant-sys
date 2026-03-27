import tableModel from "../../models/seating/table.model.js";

class TableService {

  async create(data) {
    return await tableModel.create(data);
  }

  async findAll(filter = {}) {
    return await tableModel.find(filter);
  }

  async findById(id) {
    return await tableModel.findById(id);
  }

  async update(id, data) {
    return await tableModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await tableModel.findByIdAndDelete(id);
  }

}

export default new TableService();