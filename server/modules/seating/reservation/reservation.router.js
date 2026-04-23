import express from "express";
import reservationController from "./reservation.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createReservationSchema, 
  updateReservationSchema, 
  paramsReservationSchema, 
  paramsReservationIdsSchema,
  queryReservationSchema 
} from "./reservation.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createReservationSchema), reservationController.create)
  .get(authenticateToken, validate(queryReservationSchema), reservationController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsReservationSchema), reservationController.getOne)
  .put(authenticateToken, validate(updateReservationSchema), reservationController.update)
  .delete(authenticateToken, validate(paramsReservationSchema), reservationController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsReservationSchema), reservationController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsReservationSchema), reservationController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsReservationIdsSchema), reservationController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsReservationIdsSchema), reservationController.bulkSoftDelete);


export default router;
