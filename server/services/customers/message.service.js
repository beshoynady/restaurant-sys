import messageModel from "../../models/customers/message.model.js";

class MessageService {

  async create(data) {
    return await messageModel.create(data);
  }

  async findAll(filter = {}) {
    return await messageModel.find(filter);
  }

  async findById(id) {
    return await messageModel.findById(id);
  }

  async update(id, data) {
    return await messageModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await messageModel.findByIdAndDelete(id);
  }

}

export default new MessageService();