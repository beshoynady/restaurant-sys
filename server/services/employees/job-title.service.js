import job-titleModel from "../../models/employees/job-title.model.js";

class Job-titleService {

  async create(data) {
    return await job-titleModel.create(data);
  }

  async findAll(filter = {}) {
    return await job-titleModel.find(filter);
  }

  async findById(id) {
    return await job-titleModel.findById(id);
  }

  async update(id, data) {
    return await job-titleModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await job-titleModel.findByIdAndDelete(id);
  }

}

export default new Job-titleService();