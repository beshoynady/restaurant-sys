import consumptionModel from "../../models/inventory/consumption.model.js";

class ConsumptionService {

  async create(data) {
    return await consumptionModel.create(data);
  }

  async findAll(filter = {}) {
    return await consumptionModel.find(filter);
  }

  async findById(id) {
    return await consumptionModel.findById(id);
  }

  async update(id, data) {
    return await consumptionModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await consumptionModel.findByIdAndDelete(id);
  }

}

export default new ConsumptionService();