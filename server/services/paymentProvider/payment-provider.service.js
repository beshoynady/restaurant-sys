import PaymentProviderModel from "../../models/payment-provider/payment-provider.model.js";

class PaymentProviderService {

  async create(data) {
    return await PaymentProviderModel.create(data);
  }

  async findAll(filter = {}) {
    return await PaymentProviderModel.find(filter);
  }

  async findById(id) {
    return await PaymentProviderModel.findById(id);
  }

  async update(id, data) {
    return await PaymentProviderModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await PaymentProviderModel.findByIdAndDelete(id);
  }

}

export default new PaymentProviderService();