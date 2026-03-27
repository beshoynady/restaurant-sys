import payment-channelModel from "../../models/payments/payment-channel.model.js";

class Payment-channelService {

  async create(data) {
    return await payment-channelModel.create(data);
  }

  async findAll(filter = {}) {
    return await payment-channelModel.find(filter);
  }

  async findById(id) {
    return await payment-channelModel.findById(id);
  }

  async update(id, data) {
    return await payment-channelModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await payment-channelModel.findByIdAndDelete(id);
  }

}

export default new Payment-channelService();