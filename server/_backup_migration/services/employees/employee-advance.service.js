import EmployeeAdvanceModel from "../../models/employees/employee-advance.model.js";

class EmployeeAdvanceService {

  async create(data) {
    return await EmployeeAdvanceModel.create(data);
  }

  async findAll(filter = {}) {
    return await EmployeeAdvanceModel.find(filter);
  }

  async findById(id) {
    return await EmployeeAdvanceModel.findById(id);
  }

  async update(id, data) {
    return await EmployeeAdvanceModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await EmployeeAdvanceModel.findByIdAndDelete(id);
  }

}

export default new EmployeeAdvanceService();