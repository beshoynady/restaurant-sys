import AssetCategoryModel from "../../models/assets/asset-category.model.js";

class AssetCategoryService {

  async create(data) {
    return await AssetCategoryModel.create(data);
  }

  async findAll(filter = {}) {
    return await AssetCategoryModel.find(filter);
  }

  async findById(id) {
    return await AssetCategoryModel.findById(id);
  }

  async update(id, data) {
    return await AssetCategoryModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await AssetCategoryModel.findByIdAndDelete(id);
  }

}

export default new Asset-categoryService();