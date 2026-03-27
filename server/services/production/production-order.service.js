import production-orderModel from "../../models/production/production-order.model.js";

class Production-orderService {

  async create(data) {
    return await production-orderModel.create(data);
  }

  async findAll(filter = {}) {
    return await production-orderModel.find(filter);
  }

  async findById(id) {
    return await production-orderModel.findById(id);
  }

  async update(id, data) {
    return await production-orderModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await production-orderModel.findByIdAndDelete(id);
  }

}

export default new Production-orderService();