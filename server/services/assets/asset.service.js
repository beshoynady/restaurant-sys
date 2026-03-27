import assetModel from "../../models/assets/asset.model.js";

class AssetService {

  async create(data) {
    return await assetModel.create(data);
  }

  async findAll(filter = {}) {
    return await assetModel.find(filter);
  }

  async findById(id) {
    return await assetModel.findById(id);
  }

  async update(id, data) {
    return await assetModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await assetModel.findByIdAndDelete(id);
  }

}

export default new AssetService();