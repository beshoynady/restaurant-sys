import shiftModel from "../../models/employees/shift.model.js";

class ShiftService {

  async create(data) {
    return await shiftModel.create(data);
  }

  async findAll(filter = {}) {
    return await shiftModel.find(filter);
  }

  async findById(id) {
    return await shiftModel.findById(id);
  }

  async update(id, data) {
    return await shiftModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await shiftModel.findByIdAndDelete(id);
  }

}

export default new ShiftService();