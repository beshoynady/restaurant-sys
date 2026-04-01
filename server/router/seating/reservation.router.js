import express from "express";
import reservationController from "../../controllers/seating/reservation.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createReservationSchema, updateReservationSchema, reservationParamsSchema, reservationQuerySchema } from "../../validation/seating/reservation.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createReservationSchema), reservationController.create)
  .get(authenticateToken, validate(reservationQuerySchema), reservationController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(reservationParamsSchema), reservationController.getOne)
  .put(authenticateToken, validate(updateReservationSchema), reservationController.update)
  .delete(authenticateToken, validate(reservationParamsSchema), reservationController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(reservationParamsSchema), reservationController.restore)
;

export default router;
