import orderModel from "../../models/sales/order.model.js";

class OrderService {

  async create(data) {
    return await orderModel.create(data);
  }

  async findAll(filter = {}) {
    return await orderModel.find(filter);
  }

  async findById(id) {
    return await orderModel.findById(id);
  }

  async update(id, data) {
    return await orderModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await orderModel.findByIdAndDelete(id);
  }

}

export default new OrderService();