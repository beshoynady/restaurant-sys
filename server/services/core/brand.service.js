import brandModel from "../../models/core/brand.model.js";

class BrandService {

  async create(data) {
    return await brandModel.create(data);
  }

  async findAll(filter = {}) {
    return await brandModel.find(filter);
  }

  async findById(id) {
    return await brandModel.findById(id);
  }

  async update(id, data) {
    return await brandModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await brandModel.findByIdAndDelete(id);
  }

}

export default new BrandService();