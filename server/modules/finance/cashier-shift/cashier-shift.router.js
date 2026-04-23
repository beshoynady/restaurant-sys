import express from "express";
import cashierShiftController from "./cashier-shift.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createCashierShiftSchema, 
  updateCashierShiftSchema, 
  paramsCashierShiftSchema, 
  paramsCashierShiftIdsSchema,
  queryCashierShiftSchema 
} from "../../validation/employees/cashier-shift.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createCashierShiftSchema), cashierShiftController.create)
  .get(authenticateToken, validate(queryCashierShiftSchema), cashierShiftController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsCashierShiftSchema), cashierShiftController.getOne)
  .put(authenticateToken, validate(updateCashierShiftSchema), cashierShiftController.update)
  .delete(authenticateToken, validate(paramsCashierShiftSchema), cashierShiftController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsCashierShiftSchema), cashierShiftController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsCashierShiftSchema), cashierShiftController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsCashierShiftIdsSchema), cashierShiftController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsCashierShiftIdsSchema), cashierShiftController.bulkSoftDelete);


export default router;
