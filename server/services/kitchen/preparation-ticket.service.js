import preparation-ticketModel from "../../models/kitchen/preparation-ticket.model.js";

class Preparation-ticketService {

  async create(data) {
    return await preparation-ticketModel.create(data);
  }

  async findAll(filter = {}) {
    return await preparation-ticketModel.find(filter);
  }

  async findById(id) {
    return await preparation-ticketModel.findById(id);
  }

  async update(id, data) {
    return await preparation-ticketModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await preparation-ticketModel.findByIdAndDelete(id);
  }

}

export default new Preparation-ticketService();