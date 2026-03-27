import asset-purchase-invoiceModel from "../../models/assets/asset-purchase-invoice.model.js";

class Asset-purchase-invoiceService {

  async create(data) {
    return await asset-purchase-invoiceModel.create(data);
  }

  async findAll(filter = {}) {
    return await asset-purchase-invoiceModel.find(filter);
  }

  async findById(id) {
    return await asset-purchase-invoiceModel.findById(id);
  }

  async update(id, data) {
    return await asset-purchase-invoiceModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await asset-purchase-invoiceModel.findByIdAndDelete(id);
  }

}

export default new Asset-purchase-invoiceService();