import cashier-shiftModel from "../../models/employees/cashier-shift.model.js";

class Cashier-shiftService {

  async create(data) {
    return await cashier-shiftModel.create(data);
  }

  async findAll(filter = {}) {
    return await cashier-shiftModel.find(filter);
  }

  async findById(id) {
    return await cashier-shiftModel.findById(id);
  }

  async update(id, data) {
    return await cashier-shiftModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await cashier-shiftModel.findByIdAndDelete(id);
  }

}

export default new Cashier-shiftService();