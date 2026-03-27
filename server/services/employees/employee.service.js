import employeeModel from "../../models/employees/employee.model.js";

class EmployeeService {

  async create(data) {
    return await employeeModel.create(data);
  }

  async findAll(filter = {}) {
    return await employeeModel.find(filter);
  }

  async findById(id) {
    return await employeeModel.findById(id);
  }

  async update(id, data) {
    return await employeeModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await employeeModel.findByIdAndDelete(id);
  }

}

export default new EmployeeService();