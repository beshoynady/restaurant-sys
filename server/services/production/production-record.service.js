import production-recordModel from "../../models/production/production-record.model.js";

class Production-recordService {

  async create(data) {
    return await production-recordModel.create(data);
  }

  async findAll(filter = {}) {
    return await production-recordModel.find(filter);
  }

  async findById(id) {
    return await production-recordModel.findById(id);
  }

  async update(id, data) {
    return await production-recordModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await production-recordModel.findByIdAndDelete(id);
  }

}

export default new Production-recordService();