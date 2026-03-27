import supplierModel from "../../models/purchasing/supplier.model.js";

class SupplierService {

  async create(data) {
    return await supplierModel.create(data);
  }

  async findAll(filter = {}) {
    return await supplierModel.find(filter);
  }

  async findById(id) {
    return await supplierModel.findById(id);
  }

  async update(id, data) {
    return await supplierModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await supplierModel.findByIdAndDelete(id);
  }

}

export default new SupplierService();