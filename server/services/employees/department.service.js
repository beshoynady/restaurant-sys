import departmentModel from "../../models/employees/department.model.js";

class DepartmentService {

  async create(data) {
    return await departmentModel.create(data);
  }

  async findAll(filter = {}) {
    return await departmentModel.find(filter);
  }

  async findById(id) {
    return await departmentModel.findById(id);
  }

  async update(id, data) {
    return await departmentModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await departmentModel.findByIdAndDelete(id);
  }

}

export default new DepartmentService();