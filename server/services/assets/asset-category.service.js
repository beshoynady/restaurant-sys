import asset-categoryModel from "../../models/assets/asset-category.model.js";

class Asset-categoryService {

  async create(data) {
    return await asset-categoryModel.create(data);
  }

  async findAll(filter = {}) {
    return await asset-categoryModel.find(filter);
  }

  async findById(id) {
    return await asset-categoryModel.findById(id);
  }

  async update(id, data) {
    return await asset-categoryModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await asset-categoryModel.findByIdAndDelete(id);
  }

}

export default new Asset-categoryService();