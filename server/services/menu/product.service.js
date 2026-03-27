import productModel from "../../models/menu/product.model.js";

class ProductService {

  async create(data) {
    return await productModel.create(data);
  }

  async findAll(filter = {}) {
    return await productModel.find(filter);
  }

  async findById(id) {
    return await productModel.findById(id);
  }

  async update(id, data) {
    return await productModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await productModel.findByIdAndDelete(id);
  }

}

export default new ProductService();