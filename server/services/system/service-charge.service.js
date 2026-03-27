import service-chargeModel from "../../models/system/service-charge.model.js";

class Service-chargeService {

  async create(data) {
    return await service-chargeModel.create(data);
  }

  async findAll(filter = {}) {
    return await service-chargeModel.find(filter);
  }

  async findById(id) {
    return await service-chargeModel.findById(id);
  }

  async update(id, data) {
    return await service-chargeModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await service-chargeModel.findByIdAndDelete(id);
  }

}

export default new Service-chargeService();