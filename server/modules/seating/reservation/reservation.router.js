import express from "express";
import reservationController from "./reservation.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
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
  .post(authenticateToken,
    authorize("Reservations", "create"),
    checkModuleEnabled("reservations"), validate(createReservationSchema), reservationController.create)
  .get(authenticateToken,
    authorize("Reservations", "read"),
    checkModuleEnabled("reservations"), validate(queryReservationSchema), reservationController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("Reservations", "read"),
    checkModuleEnabled("reservations"), validate(paramsReservationSchema, "params"), reservationController.getOne)
  .put(authenticateToken,
    authorize("Reservations", "update"),
    checkModuleEnabled("reservations"), validate(updateReservationSchema), reservationController.update)
  .delete(authenticateToken,
    authorize("Reservations", "delete"),
    checkModuleEnabled("reservations"), validate(paramsReservationSchema, "params"), reservationController.hardDelete) // soft delete
;

// PLATFORM_FINAL_AUDIT.md PA-08, corrected: soft-delete/restore/
// bulk-soft-delete removed — Reservation already has a complete lifecycle
// status (pending/confirmed/seated/completed/cancelled/no_show); cancel via
// PUT, not deletion.

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Reservations", "delete"),
    checkModuleEnabled("reservations"), validate(paramsReservationIdsSchema), reservationController.bulkHardDelete);


export default router;
