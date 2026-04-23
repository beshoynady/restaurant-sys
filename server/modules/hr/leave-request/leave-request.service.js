import LeaveRequestModel from "./leave-request.model.js";

class LeaveRequestService {

  async create(data) {
    return await LeaveRequestModel.create(data);
  }

  async findAll(filter = {}) {
    return await LeaveRequestModel.find(filter);
  }

  async findById(id) {
    return await LeaveRequestModel.findById(id);
  }

  async update(id, data) {
    return await LeaveRequestModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await LeaveRequestModel.findByIdAndDelete(id);
  }

}

export default new LeaveRequestService();