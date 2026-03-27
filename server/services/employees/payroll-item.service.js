import payroll-itemModel from "../../models/employees/payroll-item.model.js";

class Payroll-itemService {

  async create(data) {
    return await payroll-itemModel.create(data);
  }

  async findAll(filter = {}) {
    return await payroll-itemModel.find(filter);
  }

  async findById(id) {
    return await payroll-itemModel.findById(id);
  }

  async update(id, data) {
    return await payroll-itemModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await payroll-itemModel.findByIdAndDelete(id);
  }

}

export default new Payroll-itemService();