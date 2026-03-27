import purchase-invoiceModel from "../../models/purchasing/purchase-invoice.model.js";

class Purchase-invoiceService {

  async create(data) {
    return await purchase-invoiceModel.create(data);
  }

  async findAll(filter = {}) {
    return await purchase-invoiceModel.find(filter);
  }

  async findById(id) {
    return await purchase-invoiceModel.findById(id);
  }

  async update(id, data) {
    return await purchase-invoiceModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await purchase-invoiceModel.findByIdAndDelete(id);
  }

}

export default new Purchase-invoiceService();