import roleModel from "../../models/employees/role.model.js";

class RoleService {

  async create(data) {
    return await roleModel.create(data);
  }

  async findAll(filter = {}) {
    return await roleModel.find(filter);
  }

  async findById(id) {
    return await roleModel.findById(id);
  }

  async update(id, data) {
    return await roleModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await roleModel.findByIdAndDelete(id);
  }

}

export default new RoleService();