import payrollModel from "../../models/employees/payroll.model.js";

class PayrollService {

  async create(data) {
    return await payrollModel.create(data);
  }

  async findAll(filter = {}) {
    return await payrollModel.find(filter);
  }

  async findById(id) {
    return await payrollModel.findById(id);
  }

  async update(id, data) {
    return await payrollModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await payrollModel.findByIdAndDelete(id);
  }

}

export default new PayrollService();