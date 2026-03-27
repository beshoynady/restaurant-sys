import journal-entryModel from "../../models/accounting/journal-entry.model.js";

class Journal-entryService {

  async create(data) {
    return await journal-entryModel.create(data);
  }

  async findAll(filter = {}) {
    return await journal-entryModel.find(filter);
  }

  async findById(id) {
    return await journal-entryModel.findById(id);
  }

  async update(id, data) {
    return await journal-entryModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await journal-entryModel.findByIdAndDelete(id);
  }

}

export default new Journal-entryService();