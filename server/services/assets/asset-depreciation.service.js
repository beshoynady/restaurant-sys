import asset-depreciationModel from "../../models/assets/asset-depreciation.model.js";

class Asset-depreciationService {

  async create(data) {
    return await asset-depreciationModel.create(data);
  }

  async findAll(filter = {}) {
    return await asset-depreciationModel.find(filter);
  }

  async findById(id) {
    return await asset-depreciationModel.findById(id);
  }

  async update(id, data) {
    return await asset-depreciationModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await asset-depreciationModel.findByIdAndDelete(id);
  }

}

export default new Asset-depreciationService();