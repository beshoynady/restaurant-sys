import express from "express";
import shiftController from "./shift.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createShiftSchema, 
  updateShiftSchema, 
  paramsShiftSchema, 
  paramsShiftIdsSchema,
  queryShiftSchema 
} from "./shift.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createShiftSchema), shiftController.create)
  .get(authenticateToken, validate(queryShiftSchema), shiftController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsShiftSchema), shiftController.getOne)
  .put(authenticateToken, validate(updateShiftSchema), shiftController.update)
  .delete(authenticateToken, validate(paramsShiftSchema), shiftController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsShiftSchema), shiftController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsShiftSchema), shiftController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsShiftIdsSchema), shiftController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsShiftIdsSchema), shiftController.bulkSoftDelete);


export default router;
