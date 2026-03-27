import expenseModel from "../../models/expenses/expense.model.js";

class ExpenseService {

  async create(data) {
    return await expenseModel.create(data);
  }

  async findAll(filter = {}) {
    return await expenseModel.find(filter);
  }

  async findById(id) {
    return await expenseModel.findById(id);
  }

  async update(id, data) {
    return await expenseModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await expenseModel.findByIdAndDelete(id);
  }

}

export default new ExpenseService();