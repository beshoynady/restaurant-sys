import BaseController from "../../utils/BaseController.js";
import reservationService from "../../services/seating/reservation.service.js";

class ReservationController extends BaseController {
  constructor() {
    super(reservationService);
  }
}

export default new ReservationController();
