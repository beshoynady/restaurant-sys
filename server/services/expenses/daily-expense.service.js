import daily-expenseModel from "../../models/expenses/daily-expense.model.js";

class Daily-expenseService {

  async create(data) {
    return await daily-expenseModel.create(data);
  }

  async findAll(filter = {}) {
    return await daily-expenseModel.find(filter);
  }

  async findById(id) {
    return await daily-expenseModel.findById(id);
  }

  async update(id, data) {
    return await daily-expenseModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await daily-expenseModel.findByIdAndDelete(id);
  }

}

export default new Daily-expenseService();