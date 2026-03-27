import employee-settingsModel from "../../models/employees/employee-settings.model.js";

class Employee-settingsService {

  async create(data) {
    return await employee-settingsModel.create(data);
  }

  async findAll(filter = {}) {
    return await employee-settingsModel.find(filter);
  }

  async findById(id) {
    return await employee-settingsModel.findById(id);
  }

  async update(id, data) {
    return await employee-settingsModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await employee-settingsModel.findByIdAndDelete(id);
  }

}

export default new Employee-settingsService();