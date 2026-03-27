import product-reviewModel from "../../models/sales/product-review.model.js";

class Product-reviewService {

  async create(data) {
    return await product-reviewModel.create(data);
  }

  async findAll(filter = {}) {
    return await product-reviewModel.find(filter);
  }

  async findById(id) {
    return await product-reviewModel.findById(id);
  }

  async update(id, data) {
    return await product-reviewModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await product-reviewModel.findByIdAndDelete(id);
  }

}

export default new Product-reviewService();