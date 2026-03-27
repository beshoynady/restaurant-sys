import reservationModel from "../../models/seating/reservation.model.js";

class ReservationService {

  async create(data) {
    return await reservationModel.create(data);
  }

  async findAll(filter = {}) {
    return await reservationModel.find(filter);
  }

  async findById(id) {
    return await reservationModel.findById(id);
  }

  async update(id, data) {
    return await reservationModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await reservationModel.findByIdAndDelete(id);
  }

}

export default new ReservationService();