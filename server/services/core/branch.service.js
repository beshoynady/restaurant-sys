import branchModel from "../../models/core/branch.model.js";

class BranchService {

  async create(data) {
    return await branchModel.create(data);
  }

  async findAll(filter = {}) {
    return await branchModel.find(filter);
  }

  async findById(id) {
    return await branchModel.findById(id);
  }

  async update(id, data) {
    return await branchModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await branchModel.findByIdAndDelete(id);
  }

}

export default new BranchService();