import express from "express";
import {
  createReservation,
  getAllReservations,
  getReservationById,
  updateReservation,
  deleteReservation,
} from "../../controllers/reservation.controler.js";

const router = express.Router();

router.route("/")
.post(createReservation)
.get(getAllReservations);
router
  .route("/:id")
  .get(getReservationById)
  .put(updateReservation)
  .delete(deleteReservation);

export default router;
