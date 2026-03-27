import employee-advanceModel from "../../models/employees/employee-advance.model.js";

class Employee-advanceService {

  async create(data) {
    return await employee-advanceModel.create(data);
  }

  async findAll(filter = {}) {
    return await employee-advanceModel.find(filter);
  }

  async findById(id) {
    return await employee-advanceModel.findById(id);
  }

  async update(id, data) {
    return await employee-advanceModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await employee-advanceModel.findByIdAndDelete(id);
  }

}

export default new Employee-advanceService();