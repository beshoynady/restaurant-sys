import express from "express";
import reservationController from "../../controllers/seating/reservation.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createReservationSchema, updateReservationSchema } from "../../validation/seating/reservation.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createReservationSchema), reservationController.create)
  .get(authenticateToken, reservationController.getAll)
;

router.route("/:id")
  .get(authenticateToken, reservationController.getOne)
  .put(authenticateToken, validate(updateReservationSchema), reservationController.update)
  .delete(authenticateToken, reservationController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, reservationController.restore)
;



export default router;
