import customer-loyaltyModel from "../../models/loyalty/customer-loyalty.model.js";

class Customer-loyaltyService {

  async create(data) {
    return await customer-loyaltyModel.create(data);
  }

  async findAll(filter = {}) {
    return await customer-loyaltyModel.find(filter);
  }

  async findById(id) {
    return await customer-loyaltyModel.findById(id);
  }

  async update(id, data) {
    return await customer-loyaltyModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await customer-loyaltyModel.findByIdAndDelete(id);
  }

}

export default new Customer-loyaltyService();