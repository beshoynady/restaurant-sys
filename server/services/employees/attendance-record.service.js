import attendance-recordModel from "../../models/employees/attendance-record.model.js";

class Attendance-recordService {

  async create(data) {
    return await attendance-recordModel.create(data);
  }

  async findAll(filter = {}) {
    return await attendance-recordModel.find(filter);
  }

  async findById(id) {
    return await attendance-recordModel.findById(id);
  }

  async update(id, data) {
    return await attendance-recordModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await attendance-recordModel.findByIdAndDelete(id);
  }

}

export default new Attendance-recordService();