import promotionModel from "../../models/sales/promotion.model.js";

class PromotionService {

  async create(data) {
    return await promotionModel.create(data);
  }

  async findAll(filter = {}) {
    return await promotionModel.find(filter);
  }

  async findById(id) {
    return await promotionModel.findById(id);
  }

  async update(id, data) {
    return await promotionModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await promotionModel.findByIdAndDelete(id);
  }

}

export default new PromotionService();