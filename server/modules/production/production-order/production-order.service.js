import ProductionOrderModel from "./production-order.model.js";

class ProductionOrderService {

  async create(data) {
    return await ProductionOrderModel.create(data);
  }

  async findAll(filter = {}) {
    return await ProductionOrderModel.find(filter);
  }

  async findById(id) {
    return await ProductionOrderModel.findById(id);
  }

  async update(id, data) {
    return await ProductionOrderModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await ProductionOrderModel.findByIdAndDelete(id);
  }

}

export default new ProductionOrderService();