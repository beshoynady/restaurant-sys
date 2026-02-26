const express = require("express");
const {
  createReservation,
  getAllReservations,
  getReservationById,
  updateReservation,
  deleteReservation,
} = require("../../controllers/reservation.controler");

const router = express.Router();

router.route("/")
.post(createReservation)
.get(getAllReservations);
router
  .route("/:id")
  .get(getReservationById)
  .put(updateReservation)
  .delete(deleteReservation);

module.exports = router;
