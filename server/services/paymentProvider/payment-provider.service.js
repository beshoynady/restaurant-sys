import payment-providerModel from "../../models/paymentProvider/payment-provider.model.js";

class Payment-providerService {

  async create(data) {
    return await payment-providerModel.create(data);
  }

  async findAll(filter = {}) {
    return await payment-providerModel.find(filter);
  }

  async findById(id) {
    return await payment-providerModel.findById(id);
  }

  async update(id, data) {
    return await payment-providerModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await payment-providerModel.findByIdAndDelete(id);
  }

}

export default new Payment-providerService();