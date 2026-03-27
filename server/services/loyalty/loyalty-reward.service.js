import loyalty-rewardModel from "../../models/loyalty/loyalty-reward.model.js";

class Loyalty-rewardService {

  async create(data) {
    return await loyalty-rewardModel.create(data);
  }

  async findAll(filter = {}) {
    return await loyalty-rewardModel.find(filter);
  }

  async findById(id) {
    return await loyalty-rewardModel.findById(id);
  }

  async update(id, data) {
    return await loyalty-rewardModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await loyalty-rewardModel.findByIdAndDelete(id);
  }

}

export default new Loyalty-rewardService();