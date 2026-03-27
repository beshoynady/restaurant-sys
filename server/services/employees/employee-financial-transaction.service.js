import employee-financial-transactionModel from "../../models/employees/employee-financial-transaction.model.js";

class Employee-financial-transactionService {

  async create(data) {
    return await employee-financial-transactionModel.create(data);
  }

  async findAll(filter = {}) {
    return await employee-financial-transactionModel.find(filter);
  }

  async findById(id) {
    return await employee-financial-transactionModel.findById(id);
  }

  async update(id, data) {
    return await employee-financial-transactionModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await employee-financial-transactionModel.findByIdAndDelete(id);
  }

}

export default new Employee-financial-transactionService();