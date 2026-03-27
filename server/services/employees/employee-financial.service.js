import employee-financialModel from "../../models/employees/employee-financial.model.js";

class Employee-financialService {

  async create(data) {
    return await employee-financialModel.create(data);
  }

  async findAll(filter = {}) {
    return await employee-financialModel.find(filter);
  }

  async findById(id) {
    return await employee-financialModel.findById(id);
  }

  async update(id, data) {
    return await employee-financialModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await employee-financialModel.findByIdAndDelete(id);
  }

}

export default new Employee-financialService();