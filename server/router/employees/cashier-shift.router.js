import express from "express";
import cashierShiftController from "../../controllers/employees/cashier-shift.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createCashierShiftSchema, 
  updateCashierShiftSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/employees/cashier-shift.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createCashierShiftSchema), cashierShiftController.create)
  .get(authenticateToken, validate(querySchema()), cashierShiftController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), cashierShiftController.getOne)
  .put(authenticateToken, validate(updateCashierShiftSchema), cashierShiftController.update)
  .delete(authenticateToken, validate(paramsSchema()), cashierShiftController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), cashierShiftController.restore)
;

export default router;
