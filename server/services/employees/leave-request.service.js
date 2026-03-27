import leave-requestModel from "../../models/employees/leave-request.model.js";

class Leave-requestService {

  async create(data) {
    return await leave-requestModel.create(data);
  }

  async findAll(filter = {}) {
    return await leave-requestModel.find(filter);
  }

  async findById(id) {
    return await leave-requestModel.findById(id);
  }

  async update(id, data) {
    return await leave-requestModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await leave-requestModel.findByIdAndDelete(id);
  }

}

export default new Leave-requestService();