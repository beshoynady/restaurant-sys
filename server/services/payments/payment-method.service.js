import payment-methodModel from "../../models/payments/payment-method.model.js";

class Payment-methodService {

  async create(data) {
    return await payment-methodModel.create(data);
  }

  async findAll(filter = {}) {
    return await payment-methodModel.find(filter);
  }

  async findById(id) {
    return await payment-methodModel.findById(id);
  }

  async update(id, data) {
    return await payment-methodModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await payment-methodModel.findByIdAndDelete(id);
  }

}

export default new Payment-methodService();