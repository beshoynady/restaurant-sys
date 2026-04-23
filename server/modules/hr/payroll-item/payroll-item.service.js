import PayrollItemModel from "./payroll-item.model.js";

class PayrollItemService {

  async create(data) {
    return await PayrollItemModel.create(data);
  }

  async findAll(filter = {}) {
    return await PayrollItemModel.find(filter);
  }

  async findById(id) {
    return await PayrollItemModel.findById(id);
  }

  async update(id, data) {
    return await PayrollItemModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await PayrollItemModel.findByIdAndDelete(id);
  }

}

export default new PayrollItemService();