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

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("Reservations", "delete"),
    checkModuleEnabled("reservations"), validate(paramsReservationSchema, "params"), reservationController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("Reservations", "update"),
    checkModuleEnabled("reservations"), validate(paramsReservationSchema, "params"), reservationController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Reservations", "delete"),
    checkModuleEnabled("reservations"), validate(paramsReservationIdsSchema), reservationController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("Reservations", "delete"),
    checkModuleEnabled("reservations"),validate(paramsReservationIdsSchema), reservationController.bulkSoftDelete);


export default router;
