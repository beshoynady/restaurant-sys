import journal-lineModel from "../../models/accounting/journal-line.model.js";

class Journal-lineService {

  async create(data) {
    return await journal-lineModel.create(data);
  }

  async findAll(filter = {}) {
    return await journal-lineModel.find(filter);
  }

  async findById(id) {
    return await journal-lineModel.findById(id);
  }

  async update(id, data) {
    return await journal-lineModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await journal-lineModel.findByIdAndDelete(id);
  }

}

export default new Journal-lineService();