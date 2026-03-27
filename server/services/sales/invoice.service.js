import invoiceModel from "../../models/sales/invoice.model.js";

class InvoiceService {

  async create(data) {
    return await invoiceModel.create(data);
  }

  async findAll(filter = {}) {
    return await invoiceModel.find(filter);
  }

  async findById(id) {
    return await invoiceModel.findById(id);
  }

  async update(id, data) {
    return await invoiceModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await invoiceModel.findByIdAndDelete(id);
  }

}

export default new InvoiceService();