import BaseController from "../BaseController.js";
import reservationService from "../../services/seating/reservation.service.js";

class ReservationController extends BaseController {
  constructor() {
    super(reservationService);
  }
}

export default new ReservationController();
